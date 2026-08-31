import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { prisma } from '../src/lib/prisma.js'
import { buildTestApp, createCategory, createLiveAuction, createUser, resetDatabase, tokenFor } from './helpers.js'

const app = buildTestApp()

beforeEach(async () => {
  await resetDatabase()
})

type AuctionOverrides = Omit<Parameters<typeof createLiveAuction>[0], 'sellerId' | 'categoryId'>

async function setup(overrides: AuctionOverrides = {}) {
  const seller = await createUser({ role: 'seller' })
  const category = await createCategory()
  const { item, auction } = await createLiveAuction({ sellerId: seller.id, categoryId: category.id, ...overrides })
  return { seller, category, item, auction }
}

describe('bid placement', () => {
  it('accepts a valid bid and updates currentBid', async () => {
    const { auction } = await setup({ startingBid: 1000, bidIncrement: 100 })
    const buyer = await createUser({ role: 'buyer' })
    const token = tokenFor(buyer)

    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000 })

    expect(res.status).toBe(201)
    expect(res.body.currentBid).toBe(1000)
    expect(res.body.leaderId).toBe(buyer.id)

    const updated = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } })
    expect(Number(updated.currentBid)).toBe(1000)

    const bids = await prisma.bid.findMany({ where: { auctionId: auction.id } })
    expect(bids).toHaveLength(1)
    expect(bids[0]!.userId).toBe(buyer.id)
  })

  it('rejects a bid below the minimum next amount', async () => {
    const { auction } = await setup({ startingBid: 1000, bidIncrement: 100 })
    const first = await createUser({ role: 'buyer' })
    const second = await createUser({ role: 'buyer' })

    await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set('Authorization', `Bearer ${tokenFor(first)}`)
      .send({ amount: 1000 })
      .expect(201)

    // Minimum next bid is now 1100 (1000 + 100 increment) — 1050 is too low.
    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set('Authorization', `Bearer ${tokenFor(second)}`)
      .send({ amount: 1050 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/at least 1100/)

    const updated = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } })
    expect(Number(updated.currentBid)).toBe(1000) // unchanged
  })

  it('resolves several near-simultaneous bids so exactly one wins, never more, never none', async () => {
    const { auction } = await setup({ startingBid: 1000, bidIncrement: 100 })
    const CONTENDERS = 6
    const bidders = await Promise.all(Array.from({ length: CONTENDERS }, () => createUser({ role: 'buyer' })))

    // All contenders bid the exact same valid amount against the exact same
    // starting state at once. With only two requests, Node/Postgres often
    // resolve one fully before the other's read even lands — that's a
    // legitimate "not concurrent enough" outcome, not a bug, but it doesn't
    // exercise the race path this test exists to check. With six firing via
    // Promise.all, real network round-trips to Postgres make it very likely
    // several of them have already read the pre-bid state before any of
    // them commits, which is what actually exercises the optimistic-
    // concurrency guard (tx.auction.updateMany's WHERE clause) rather than
    // just the plain "amount too low" check.
    const responses = await Promise.all(
      bidders.map((bidder) =>
        request(app).post(`/api/auctions/${auction.id}/bids`).set('Authorization', `Bearer ${tokenFor(bidder)}`).send({ amount: 1000 }),
      ),
    )

    const succeeded = responses.filter((r) => r.status === 201)
    const failed = responses.filter((r) => r.status !== 201)
    // Exactly one contender is ever accepted as the new current bid — never
    // more than one (that would mean two bids both won), never zero (that
    // would mean the winning bid got lost entirely).
    expect(succeeded).toHaveLength(1)
    expect(failed).toHaveLength(CONTENDERS - 1)
    // Every loser is rejected for one of two legitimate reasons: it lost the
    // live race against the row-locked update (409 — the concurrency guard
    // this test targets), or its read landed after the winner had already
    // committed, so its own bid was correctly evaluated as too low against
    // the new price (400). Anything else would be a bug.
    for (const res of failed) expect([400, 409]).toContain(res.status)
    // With six genuine contenders, at least one should actually collide at
    // the database level rather than every loser simply reading late.
    expect(failed.some((r) => r.status === 409)).toBe(true)

    const bids = await prisma.bid.findMany({ where: { auctionId: auction.id } })
    expect(bids).toHaveLength(1) // exactly one bid was ever persisted

    const updated = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } })
    expect(Number(updated.currentBid)).toBe(1000)

    const winnerIndex = responses.indexOf(succeeded[0]!)
    expect(bids[0]!.userId).toBe(bidders[winnerIndex]!.id)
  })
})

describe('proxy / max-bid', () => {
  it('auto-counters up to, but never beyond, the set maximum', async () => {
    const { auction } = await setup({ startingBid: 1000, bidIncrement: 100 })
    const proxyBidder = await createUser({ role: 'buyer' })
    const challenger = await createUser({ role: 'buyer' })

    // No competition yet — proxy bidder's max of 5000 only needs to cover
    // the starting bid, so it should proxy-bid exactly the minimum: 1000.
    const maxRes = await request(app)
      .post(`/api/auctions/${auction.id}/max-bid`)
      .set('Authorization', `Bearer ${tokenFor(proxyBidder)}`)
      .send({ amount: 5000 })
      .expect(200)

    expect(maxRes.body.currentBid).toBe(1000)
    expect(maxRes.body.leaderId).toBe(proxyBidder.id)

    // Challenger bids the next valid increment (1100). Proxy bidder's ceiling
    // (5000) comfortably covers it, so the engine should auto-counter with
    // exactly one more increment (1200) — not jump straight to the max.
    const bidRes = await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set('Authorization', `Bearer ${tokenFor(challenger)}`)
      .send({ amount: 1100 })
      .expect(201)

    expect(bidRes.body.currentBid).toBe(1200)
    expect(bidRes.body.leaderId).toBe(proxyBidder.id)

    // Challenger now bids well beyond the proxy bidder's 5000 ceiling —
    // the proxy must NOT counter past its max, so the challenger wins.
    const finalRes = await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set('Authorization', `Bearer ${tokenFor(challenger)}`)
      .send({ amount: 6000 })
      .expect(201)

    expect(finalRes.body.currentBid).toBe(6000)
    expect(finalRes.body.leaderId).toBe(challenger.id)

    const proxyBids = await prisma.bid.findMany({ where: { auctionId: auction.id, userId: proxyBidder.id } })
    for (const bid of proxyBids) {
      expect(Number(bid.amount)).toBeLessThanOrEqual(5000)
    }
  })
})

describe('anti-snipe', () => {
  it('extends the auction end time by 30 seconds when a bid lands inside the last 30 seconds', async () => {
    const { auction } = await setup({ startingBid: 1000, bidIncrement: 100, endsInMs: 20_000 }) // ends in 20s — inside the window
    const bidder = await createUser({ role: 'buyer' })

    const originalEndTime = auction.endTime.getTime()

    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set('Authorization', `Bearer ${tokenFor(bidder)}`)
      .send({ amount: 1000 })
      .expect(201)

    const newEndTime = new Date(res.body.endTime).getTime()
    expect(newEndTime - originalEndTime).toBe(30_000)

    const updated = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } })
    expect(updated.endTime.getTime()).toBe(newEndTime)
  })

  it('does not extend the end time for a bid well outside the anti-snipe window', async () => {
    const { auction } = await setup({ startingBid: 1000, bidIncrement: 100, endsInMs: 3_600_000 }) // ends in 1h
    const bidder = await createUser({ role: 'buyer' })

    const originalEndTime = auction.endTime.getTime()

    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set('Authorization', `Bearer ${tokenFor(bidder)}`)
      .send({ amount: 1000 })
      .expect(201)

    expect(new Date(res.body.endTime).getTime()).toBe(originalEndTime)
  })
})

import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getIO } from './io.js'

const ANTI_SNIPE_WINDOW_MS = 30_000
const ANTI_SNIPE_EXTENSION_MS = 30_000

export class BidError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

interface CreatedBid {
  id: string
  userId: string
  amount: number
  isProxy: boolean
  createdAt: Date
}

interface CascadeResult {
  currentBid: number | null
  leaderId: string | null
  endTime: Date
  extended: boolean
  bidsCreated: CreatedBid[]
}

function minNextBid(currentBid: number | null, startingBid: number, bidIncrement: number) {
  return currentBid === null ? startingBid : currentBid + bidIncrement
}

/**
 * Repeatedly finds the highest other maxBid capable of beating the current
 * price by one increment and auto-places a bid for that user, until no
 * remaining maxBid can outbid the leader. Also re-checks anti-snipe on every
 * proxy bid it creates. All bids are created inside the caller's transaction.
 */
async function resolveProxyCascade(
  tx: Prisma.TransactionClient,
  auctionId: string,
  bidIncrement: number,
  startingBid: number,
  currentBid: number | null,
  leaderId: string | null,
  endTime: Date,
  now: Date,
): Promise<CascadeResult> {
  let price = currentBid
  let leader = leaderId
  let deadline = endTime
  let extended = false
  const bidsCreated: CreatedBid[] = []

  const maxBids = await tx.maxBid.findMany({ where: { auctionId } })
  const remaining = new Map(maxBids.map((m) => [m.userId, Number(m.amount)]))
  if (leader) remaining.delete(leader)

  // Bounded defensively; converges in a handful of rounds in practice.
  for (let i = 0; i < 100; i++) {
    const minToBeat = minNextBid(price, startingBid, bidIncrement)

    let bestUserId: string | null = null
    let bestAmount = -Infinity
    for (const [userId, amount] of remaining) {
      if (amount >= minToBeat && amount > bestAmount) {
        bestUserId = userId
        bestAmount = amount
      }
    }
    if (!bestUserId) break

    const proxyAmount = Math.min(bestAmount, minToBeat)
    price = proxyAmount
    leader = bestUserId
    remaining.delete(bestUserId)

    const bid = await tx.bid.create({
      data: { auctionId, userId: bestUserId, amount: proxyAmount, isProxy: true },
    })
    bidsCreated.push({ id: bid.id, userId: bestUserId, amount: proxyAmount, isProxy: true, createdAt: bid.createdAt })

    if (deadline.getTime() - now.getTime() <= ANTI_SNIPE_WINDOW_MS) {
      deadline = new Date(deadline.getTime() + ANTI_SNIPE_EXTENSION_MS)
      extended = true
    }
  }

  if (price !== currentBid || deadline.getTime() !== endTime.getTime()) {
    await tx.auction.update({ where: { id: auctionId }, data: { currentBid: price, endTime: deadline } })
  }

  return { currentBid: price, leaderId: leader, endTime: deadline, extended, bidsCreated }
}

function assertAuctionIsLive(auction: { status: string; startTime: Date; endTime: Date }, now: Date) {
  if (auction.status !== 'live') throw new BidError('This auction is not currently live', 409)
  if (now < auction.startTime) throw new BidError('This auction has not started yet', 409)
  if (now >= auction.endTime) throw new BidError('This auction has already ended', 409)
}

async function broadcastBids(auctionId: string, bids: CreatedBid[], finalEndTime: Date, extended: boolean) {
  if (bids.length === 0) {
    if (extended) getIO().to(auctionId).emit('auction:extended', { endTime: finalEndTime })
    return
  }

  const userIds = [...new Set(bids.map((b) => b.userId))]
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
  const names = new Map(users.map((u) => [u.id, u.name]))

  const io = getIO()
  for (const bid of bids) {
    io.to(auctionId).emit('auction:bid', {
      bid: {
        id: bid.id,
        amount: String(bid.amount),
        createdAt: bid.createdAt,
        isProxy: bid.isProxy,
        user: { id: bid.userId, name: names.get(bid.userId) ?? 'A bidder' },
      },
      currentBid: String(bid.amount),
      endTime: finalEndTime,
    })
  }
  if (extended) io.to(auctionId).emit('auction:extended', { endTime: finalEndTime })
}

export async function placeBid(auctionId: string, userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BidError('amount must be a positive number')
  }

  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } })
    if (!auction) throw new BidError('Auction not found', 404)

    assertAuctionIsLive(auction, now)

    const startingBid = Number(auction.startingBid)
    const bidIncrement = Number(auction.bidIncrement)
    const currentBid = auction.currentBid === null ? null : Number(auction.currentBid)
    const minRequired = minNextBid(currentBid, startingBid, bidIncrement)
    if (amount < minRequired) {
      throw new BidError(`Bid must be at least ${minRequired}`)
    }

    // Optimistic concurrency guard: this update only succeeds if currentBid
    // still matches what we just read. Postgres also row-locks the auction
    // for the duration of this UPDATE, so a second, near-simultaneous bid's
    // UPDATE blocks until this transaction commits, then re-evaluates its
    // WHERE clause against the now-changed value and correctly matches
    // nothing — only one of two near-simultaneous bids can ever win.
    const updateResult = await tx.auction.updateMany({
      where: { id: auctionId, currentBid: auction.currentBid },
      data: { currentBid: amount },
    })
    if (updateResult.count === 0) {
      throw new BidError('Someone else just placed a bid — please try again', 409)
    }

    const humanBid = await tx.bid.create({ data: { auctionId, userId, amount, isProxy: false } })

    let endTime = auction.endTime
    let extended = false
    if (endTime.getTime() - now.getTime() <= ANTI_SNIPE_WINDOW_MS) {
      endTime = new Date(endTime.getTime() + ANTI_SNIPE_EXTENSION_MS)
      extended = true
      await tx.auction.update({ where: { id: auctionId }, data: { endTime } })
    }

    const cascade = await resolveProxyCascade(tx, auctionId, bidIncrement, startingBid, amount, userId, endTime, now)

    const allBids: CreatedBid[] = [
      { id: humanBid.id, userId, amount, isProxy: false, createdAt: humanBid.createdAt },
      ...cascade.bidsCreated,
    ]

    return {
      currentBid: cascade.currentBid,
      leaderId: cascade.leaderId,
      endTime: cascade.endTime,
      extended: extended || cascade.extended,
      allBids,
    }
  })

  await broadcastBids(auctionId, result.allBids, result.endTime, result.extended)

  return { currentBid: result.currentBid, endTime: result.endTime, leaderId: result.leaderId }
}

export async function setMaxBid(auctionId: string, userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BidError('amount must be a positive number')
  }

  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } })
    if (!auction) throw new BidError('Auction not found', 404)

    assertAuctionIsLive(auction, now)

    const startingBid = Number(auction.startingBid)
    const bidIncrement = Number(auction.bidIncrement)
    const currentBid = auction.currentBid === null ? null : Number(auction.currentBid)
    const minRequired = minNextBid(currentBid, startingBid, bidIncrement)
    if (amount < minRequired) {
      throw new BidError(`Maximum bid must be at least ${minRequired}`)
    }

    await tx.maxBid.upsert({
      where: { auctionId_userId: { auctionId, userId } },
      update: { amount },
      create: { auctionId, userId, amount },
    })

    const leaderBid = await tx.bid.findFirst({ where: { auctionId }, orderBy: { createdAt: 'desc' } })
    const leaderId = leaderBid?.userId ?? null

    if (leaderId === userId) {
      // Already winning; nothing to resolve, just save the new ceiling.
      return { currentBid: currentBid ?? startingBid, leaderId, endTime: auction.endTime, extended: false, bidsCreated: [] as CreatedBid[] }
    }

    return resolveProxyCascade(tx, auctionId, bidIncrement, startingBid, currentBid, leaderId, auction.endTime, now)
  })

  await broadcastBids(auctionId, result.bidsCreated, result.endTime, result.extended)

  return { amount, currentBid: result.currentBid, leaderId: result.leaderId }
}

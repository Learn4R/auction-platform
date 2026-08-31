import crypto from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { prisma } from '../src/lib/prisma.js'
import { buildTestApp, createCategory, createUser, resetDatabase, tokenFor } from './helpers.js'

const app = buildTestApp()

beforeEach(async () => {
  await resetDatabase()
})

function sign(orderId: string, paymentId: string) {
  return crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex')
}

/**
 * Sets up a paid-but-not-yet-verified order directly via Prisma — the
 * signature-verification logic under test doesn't depend on a real Razorpay
 * order existing (verify-payment only checks that razorpayOrderId matches
 * what's already stored), so this skips the network call to Razorpay's API
 * entirely and keeps these tests fast and offline.
 */
async function setupOrder() {
  const seller = await createUser({ role: 'seller' })
  const buyer = await createUser({ role: 'buyer' })
  const category = await createCategory()

  const item = await prisma.item.create({
    data: { title: 'Test Lot', description: 'A test lot.', categoryId: category.id, sellerId: seller.id, status: 'approved', images: [] },
  })
  const auction = await prisma.auction.create({
    data: {
      itemId: item.id,
      startingBid: 1000,
      bidIncrement: 100,
      status: 'ended',
      startTime: new Date(Date.now() - 3_600_000),
      endTime: new Date(Date.now() - 60_000),
      winnerId: buyer.id,
      currentBid: 1000,
    },
  })
  const order = await prisma.order.create({
    data: {
      auctionId: auction.id,
      buyerId: buyer.id,
      winningBid: 1000,
      buyerPremium: 100,
      totalAmount: 1100,
      razorpayOrderId: `order_test_${auction.id}`,
    },
  })

  return { seller, buyer, item, auction, order }
}

describe('payment verification', () => {
  it('accepts a correctly-signed payment and marks the order paid', async () => {
    const { buyer, order } = await setupOrder()
    const paymentId = 'pay_test_valid'
    const signature = sign(order.razorpayOrderId!, paymentId)

    const res = await request(app)
      .post(`/api/orders/${order.id}/verify-payment`)
      .set('Authorization', `Bearer ${tokenFor(buyer)}`)
      .send({ razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature })

    expect(res.status).toBe(200)
    expect(res.body.paymentStatus).toBe('paid')

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.paymentStatus).toBe('paid')
    expect(updated.razorpayPaymentId).toBe(paymentId)

    const payouts = await prisma.payout.findMany({ where: { orderId: order.id } })
    expect(payouts).toHaveLength(1)
    expect(Number(payouts[0]!.grossAmount)).toBe(1000)
  })

  it('rejects a tampered or incorrect signature', async () => {
    const { buyer, order } = await setupOrder()
    const paymentId = 'pay_test_tampered'
    const wrongSignature = sign(order.razorpayOrderId!, 'a-different-payment-id')

    const res = await request(app)
      .post(`/api/orders/${order.id}/verify-payment`)
      .set('Authorization', `Bearer ${tokenFor(buyer)}`)
      .send({ razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: wrongSignature })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/signature/i)

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.paymentStatus).toBe('pending')

    const payouts = await prisma.payout.findMany({ where: { orderId: order.id } })
    expect(payouts).toHaveLength(0)
  })

  it('does not double-process an order that is already paid', async () => {
    const { buyer, order } = await setupOrder()
    const paymentId = 'pay_test_repeat'
    const signature = sign(order.razorpayOrderId!, paymentId)

    const body = { razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature }

    await request(app).post(`/api/orders/${order.id}/verify-payment`).set('Authorization', `Bearer ${tokenFor(buyer)}`).send(body).expect(200)

    // Same request again — e.g. a duplicate client call, or the webhook
    // firing for a payment the browser already confirmed.
    const secondRes = await request(app)
      .post(`/api/orders/${order.id}/verify-payment`)
      .set('Authorization', `Bearer ${tokenFor(buyer)}`)
      .send(body)

    expect(secondRes.status).toBe(200)
    expect(secondRes.body.paymentStatus).toBe('paid')

    const payouts = await prisma.payout.findMany({ where: { orderId: order.id } })
    expect(payouts).toHaveLength(1) // still exactly one — no duplicate
  })
})

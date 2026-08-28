import crypto from 'node:crypto'
import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getRazorpay } from '../lib/razorpay.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

const orderSelect = {
  id: true,
  winningBid: true,
  buyerPremium: true,
  totalAmount: true,
  paymentStatus: true,
  shippingStatus: true,
  razorpayOrderId: true,
  createdAt: true,
  auction: {
    select: {
      id: true,
      endTime: true,
      item: {
        select: { id: true, title: true, category: { select: { name: true } } },
      },
    },
  },
  review: {
    select: { id: true, rating: true, comment: true, createdAt: true },
  },
}

router.get('/', authenticate(), async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { buyerId: req.user!.id },
    select: orderSelect,
    orderBy: { createdAt: 'desc' },
  })

  res.json(orders)
})

router.post<{ id: string }>('/:id/create-payment', authenticate(), async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order) {
    res.status(404).json({ error: 'order not found' })
    return
  }
  if (order.buyerId !== req.user!.id) {
    res.status(403).json({ error: 'this is not your order' })
    return
  }
  if (order.paymentStatus === 'paid') {
    res.status(409).json({ error: 'order is already paid' })
    return
  }

  const amountInPaise = Math.round(Number(order.totalAmount) * 100)

  const razorpayOrder = await getRazorpay().orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: order.id,
  })

  await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: razorpayOrder.id } })

  res.json({
    razorpayOrderId: razorpayOrder.id,
    amount: amountInPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
  })
})

router.post<{ id: string }>('/:id/verify-payment', authenticate(), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {}

  if (
    typeof razorpay_order_id !== 'string' ||
    typeof razorpay_payment_id !== 'string' ||
    typeof razorpay_signature !== 'string'
  ) {
    res.status(400).json({ error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required' })
    return
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order) {
    res.status(404).json({ error: 'order not found' })
    return
  }
  if (order.buyerId !== req.user!.id) {
    res.status(403).json({ error: 'this is not your order' })
    return
  }
  if (order.razorpayOrderId !== razorpay_order_id) {
    res.status(400).json({ error: 'razorpay_order_id does not match this order' })
    return
  }

  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    res.status(500).json({ error: 'Payment configuration is missing' })
    return
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    res.status(400).json({ error: 'Payment signature verification failed' })
    return
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'paid', razorpayPaymentId: razorpay_payment_id },
    select: orderSelect,
  })

  res.json(updated)
})

router.post<{ id: string }>('/:id/review', authenticate(), async (req, res) => {
  const { rating, comment } = req.body ?? {}

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'rating must be an integer from 1 to 5' })
    return
  }
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    res.status(400).json({ error: 'comment must be a string' })
    return
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { auction: { include: { item: { select: { sellerId: true } } } }, review: true },
  })

  if (!order) {
    res.status(404).json({ error: 'order not found' })
    return
  }
  if (order.buyerId !== req.user!.id) {
    res.status(403).json({ error: 'this is not your order' })
    return
  }
  if (order.paymentStatus !== 'paid') {
    res.status(409).json({ error: 'you can only review a paid order' })
    return
  }
  if (order.review) {
    res.status(409).json({ error: 'this order already has a review' })
    return
  }

  try {
    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        reviewerId: req.user!.id,
        sellerId: order.auction.item.sellerId,
        rating,
        comment: comment || null,
      },
      select: { id: true, rating: true, comment: true, createdAt: true },
    })
    res.status(201).json(review)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'this order already has a review' })
      return
    }
    throw err
  }
})

export default router

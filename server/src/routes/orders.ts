import crypto from 'node:crypto'
import { Router } from 'express'
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

export default router

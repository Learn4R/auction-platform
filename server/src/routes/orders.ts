import crypto from 'node:crypto'
import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getRazorpay } from '../lib/razorpay.js'
import { getSellerCommissionPercent } from '../lib/settings.js'
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
  shippingName: true,
  shippingPhone: true,
  shippingAddressLine1: true,
  shippingAddressLine2: true,
  shippingCity: true,
  shippingState: true,
  shippingPincode: true,
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

const PINCODE_REGEX = /^[0-9]{6}$/

router.patch<{ id: string }>('/:id/shipping-address', authenticate(), async (req, res) => {
  const { name, phone, addressLine1, addressLine2, city, state, pincode, saveAsDefault } = req.body ?? {}

  const required: Record<string, unknown> = { name, phone, addressLine1, city, state, pincode }
  for (const [field, value] of Object.entries(required)) {
    if (typeof value !== 'string' || !value.trim()) {
      res.status(400).json({ error: `${field} is required` })
      return
    }
  }
  if (addressLine2 !== undefined && addressLine2 !== null && typeof addressLine2 !== 'string') {
    res.status(400).json({ error: 'addressLine2 must be a string' })
    return
  }
  if (!PINCODE_REGEX.test((pincode as string).trim())) {
    res.status(400).json({ error: 'pincode must be a 6-digit Indian PIN code' })
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

  const addressData = {
    shippingName: (name as string).trim(),
    shippingPhone: (phone as string).trim(),
    shippingAddressLine1: (addressLine1 as string).trim(),
    shippingAddressLine2: addressLine2 ? (addressLine2 as string).trim() : null,
    shippingCity: (city as string).trim(),
    shippingState: (state as string).trim(),
    shippingPincode: (pincode as string).trim(),
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: addressData,
    select: orderSelect,
  })

  if (saveAsDefault === true) {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        defaultShippingName: addressData.shippingName,
        defaultShippingPhone: addressData.shippingPhone,
        defaultShippingAddressLine1: addressData.shippingAddressLine1,
        defaultShippingAddressLine2: addressData.shippingAddressLine2,
        defaultShippingCity: addressData.shippingCity,
        defaultShippingState: addressData.shippingState,
        defaultShippingPincode: addressData.shippingPincode,
      },
    })
  }

  res.json(updated)
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
  if (!order.shippingName || !order.shippingAddressLine1 || !order.shippingCity || !order.shippingState || !order.shippingPincode) {
    res.status(400).json({ error: 'Please add a shipping address before proceeding to payment.' })
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

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { auction: { include: { item: { select: { sellerId: true } } } } },
  })
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

  const wasAlreadyPaid = order.paymentStatus === 'paid'

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'paid', razorpayPaymentId: razorpay_payment_id },
      select: orderSelect,
    })

    if (!wasAlreadyPaid) {
      const commissionPercent = await getSellerCommissionPercent(tx)
      const gross = Number(order.winningBid)
      const commissionAmount = Math.round(gross * (commissionPercent / 100) * 100) / 100
      const netAmount = gross - commissionAmount

      await tx.payout.create({
        data: {
          sellerId: order.auction.item.sellerId,
          orderId: order.id,
          grossAmount: gross,
          commissionAmount,
          netAmount,
        },
      })
    }

    return result
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

import { ShippingStatus } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'
import { getRazorpay } from '../../lib/razorpay.js'

const router = Router()

export const orderSelect = {
  id: true,
  winningBid: true,
  buyerPremium: true,
  totalAmount: true,
  paymentStatus: true,
  shippingStatus: true,
  createdAt: true,
  shippingName: true,
  shippingPhone: true,
  shippingAddressLine1: true,
  shippingAddressLine2: true,
  shippingCity: true,
  shippingState: true,
  shippingPincode: true,
  refundReason: true,
  refundedAt: true,
  razorpayRefundId: true,
  buyer: { select: { id: true, name: true } },
  auction: {
    select: {
      id: true,
      item: { select: { id: true, title: true } },
    },
  },
}

router.get('/', authenticate('admin'), async (_req, res) => {
  const orders = await prisma.order.findMany({
    select: orderSelect,
    orderBy: { createdAt: 'desc' },
  })

  res.json(orders)
})

router.patch<{ id: string }>('/:id/shipping-status', authenticate('admin'), async (req, res) => {
  const { status } = req.body ?? {}

  if (typeof status !== 'string' || !Object.values(ShippingStatus).includes(status as ShippingStatus)) {
    res.status(400).json({ error: `status must be one of: ${Object.values(ShippingStatus).join(', ')}` })
    return
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order) {
    res.status(404).json({ error: 'order not found' })
    return
  }
  if (order.paymentStatus !== 'paid') {
    res.status(409).json({ error: 'order must be paid before its shipping status can be updated' })
    return
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { shippingStatus: status as ShippingStatus },
    select: orderSelect,
  })

  res.json(updated)
})

router.post<{ id: string }>('/:id/refund', authenticate('admin'), async (req, res) => {
  const { reason } = req.body ?? {}

  if (typeof reason !== 'string' || !reason.trim()) {
    res.status(400).json({ error: 'reason is required' })
    return
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      payout: true,
      buyer: { select: { name: true } },
      auction: { include: { item: { select: { title: true } } } },
    },
  })
  if (!order) {
    res.status(404).json({ error: 'order not found' })
    return
  }
  if (order.paymentStatus !== 'paid') {
    res.status(409).json({ error: `only a paid order can be refunded (current status: ${order.paymentStatus})` })
    return
  }
  if (!order.razorpayPaymentId) {
    res.status(409).json({ error: 'order has no recorded payment to refund' })
    return
  }

  const trimmedReason = reason.trim()
  const itemTitle = order.auction.item.title ?? order.id

  // The Razorpay call is the source of truth and can't be rolled back, so it
  // happens first — only once we know it succeeded do we commit the DB
  // changes, mirroring the create-payment/verify-payment split elsewhere.
  const refund = await getRazorpay().payments.refund(order.razorpayPaymentId, {
    notes: { reason: trimmedReason, orderId: order.id },
  })

  // A payout not yet paid out to the seller can simply be put on hold. One
  // already marked paid can't be silently reversed here — that money is
  // already with the seller, so this needs a human to follow up directly.
  // Give that case its own admin-action label so it's unmistakable in the
  // audit log rather than looking like a routine refund.
  const payoutAlreadyPaid = order.payout?.status === 'paid'
  if (payoutAlreadyPaid) {
    console.warn(
      `[refund] Order ${order.id} (${itemTitle}) refunded but its payout was already marked paid — ` +
        `a human needs to follow up with the seller to recover the ${order.payout!.netAmount} payout.`,
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'refunded',
        refundedAt: new Date(),
        refundReason: trimmedReason,
        razorpayRefundId: refund.id,
      },
      select: orderSelect,
    })

    if (order.payout && (order.payout.status === 'pending' || order.payout.status === 'processing')) {
      await tx.payout.update({ where: { id: order.payout.id }, data: { status: 'on_hold' } })
    }

    await tx.adminAction.create({
      data: {
        adminId: req.user!.id,
        action: payoutAlreadyPaid ? 'refund_order_payout_already_paid' : 'refund_order',
        target: payoutAlreadyPaid
          ? `${itemTitle} (buyer: ${order.buyer.name}) — refunded: ${trimmedReason}. NEEDS FOLLOW-UP: payout was already paid to the seller — contact them directly to recover funds.`
          : `${itemTitle} (buyer: ${order.buyer.name}) — refunded: ${trimmedReason}`,
      },
    })

    return updatedOrder
  })

  res.json(updated)
})

export default router

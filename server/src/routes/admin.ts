import { ShippingStatus } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { itemWithProposalSelect } from './items.js'

const router = Router()

router.get('/items/pending', authenticate('admin'), async (_req, res) => {
  const items = await prisma.item.findMany({
    where: { status: 'pending' },
    select: itemWithProposalSelect,
    orderBy: { title: 'asc' },
  })

  res.json(items)
})

router.patch<{ id: string }>('/items/:id/approve', authenticate('admin'), async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } })

  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }
  if (item.status !== 'pending') {
    res.status(409).json({ error: `item is not pending (current status: ${item.status})` })
    return
  }
  if (
    item.proposedStartingBid === null ||
    item.proposedBidIncrement === null ||
    item.proposedStartTime === null ||
    item.proposedEndTime === null
  ) {
    res.status(409).json({ error: 'item is missing proposed auction settings' })
    return
  }

  const auctionStatus = item.proposedStartTime <= new Date() ? 'live' : 'upcoming'

  const updated = await prisma.$transaction(async (tx) => {
    await tx.auction.create({
      data: {
        itemId: item.id,
        startingBid: item.proposedStartingBid!,
        bidIncrement: item.proposedBidIncrement!,
        startTime: item.proposedStartTime!,
        endTime: item.proposedEndTime!,
        status: auctionStatus,
      },
    })

    return tx.item.update({
      where: { id: item.id },
      data: { status: 'approved' },
      select: itemWithProposalSelect,
    })
  })

  res.json(updated)
})

router.patch<{ id: string }>('/items/:id/reject', authenticate('admin'), async (req, res) => {
  const { reason } = req.body ?? {}

  if (typeof reason !== 'string' || !reason.trim()) {
    res.status(400).json({ error: 'reason is required' })
    return
  }

  const item = await prisma.item.findUnique({ where: { id: req.params.id } })

  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }
  if (item.status !== 'pending') {
    res.status(409).json({ error: `item is not pending (current status: ${item.status})` })
    return
  }

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: { status: 'rejected', rejectionReason: reason },
    select: itemWithProposalSelect,
  })

  res.json(updated)
})

const orderSelect = {
  id: true,
  winningBid: true,
  buyerPremium: true,
  totalAmount: true,
  paymentStatus: true,
  shippingStatus: true,
  createdAt: true,
  buyer: { select: { id: true, name: true } },
  auction: {
    select: {
      id: true,
      item: { select: { id: true, title: true } },
    },
  },
}

router.get('/orders', authenticate('admin'), async (_req, res) => {
  const orders = await prisma.order.findMany({
    select: orderSelect,
    orderBy: { createdAt: 'desc' },
  })

  res.json(orders)
})

router.patch<{ id: string }>('/orders/:id/shipping-status', authenticate('admin'), async (req, res) => {
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

export default router

import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'
import { itemWithProposalSelect } from '../items.js'

const router = Router()

router.get('/pending', authenticate('admin'), async (_req, res) => {
  const items = await prisma.item.findMany({
    where: { status: 'pending' },
    select: itemWithProposalSelect,
    orderBy: { title: 'asc' },
  })

  res.json(items)
})

router.patch<{ id: string }>('/:id/approve', authenticate('admin'), async (req, res) => {
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

router.patch<{ id: string }>('/:id/reject', authenticate('admin'), async (req, res) => {
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

export default router

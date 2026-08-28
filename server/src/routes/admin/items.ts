import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'
import { logAdminAction } from '../../lib/auditLog.js'
import { notifyNow, createNotification, broadcastNotifications } from '../../lib/notify.js'
import { itemWithProposalSelect, withDisplayStatus } from '../items.js'

const router = Router()

const REVIEWABLE_STATUSES = ['submitted', 'under_review'] as const

router.get('/pending', authenticate('admin'), async (_req, res) => {
  const items = await prisma.item.findMany({
    where: { status: 'submitted' },
    select: itemWithProposalSelect,
    orderBy: { title: 'asc' },
  })

  res.json(items.map(withDisplayStatus))
})

router.get('/under-review', authenticate('admin'), async (_req, res) => {
  const items = await prisma.item.findMany({
    where: { status: 'under_review' },
    select: itemWithProposalSelect,
    orderBy: { title: 'asc' },
  })

  res.json(items.map(withDisplayStatus))
})

router.patch<{ id: string }>('/:id/mark-under-review', authenticate('admin'), async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } })

  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }
  if (item.status !== 'submitted') {
    res.status(409).json({ error: `item is not submitted (current status: ${item.status})` })
    return
  }

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: { status: 'under_review' },
    select: itemWithProposalSelect,
  })

  await logAdminAction(req.user!.id, 'mark_item_under_review', item.title ?? item.id)

  res.json(withDisplayStatus(updated))
})

router.patch<{ id: string }>('/:id/request-changes', authenticate('admin'), async (req, res) => {
  const { note } = req.body ?? {}

  if (typeof note !== 'string' || !note.trim()) {
    res.status(400).json({ error: 'note is required' })
    return
  }

  const item = await prisma.item.findUnique({ where: { id: req.params.id } })

  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }
  if (!REVIEWABLE_STATUSES.includes(item.status as (typeof REVIEWABLE_STATUSES)[number])) {
    res.status(409).json({ error: `changes cannot be requested from status: ${item.status}` })
    return
  }

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: { status: 'changes_requested', changesRequestedNote: note },
    select: itemWithProposalSelect,
  })

  await logAdminAction(req.user!.id, 'request_item_changes', `${item.title ?? item.id} — note: ${note}`)

  res.json(withDisplayStatus(updated))
})

router.patch<{ id: string }>('/:id/approve', authenticate('admin'), async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } })

  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }
  if (!REVIEWABLE_STATUSES.includes(item.status as (typeof REVIEWABLE_STATUSES)[number])) {
    res.status(409).json({ error: `item is not submitted or under review (current status: ${item.status})` })
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

    const updatedItem = await tx.item.update({
      where: { id: item.id },
      data: { status: 'approved' },
      select: itemWithProposalSelect,
    })

    await tx.adminAction.create({
      data: { adminId: req.user!.id, action: 'approve_item', target: item.title ?? item.id },
    })

    const notification = await createNotification(tx, {
      userId: item.sellerId,
      type: 'listing_approved',
      message: `Your listing "${item.title}" was approved and is now live for bidding`,
      itemId: item.id,
    })

    return { updatedItem, notification }
  })

  broadcastNotifications([updated.notification])

  res.json(withDisplayStatus(updated.updatedItem))
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
  if (!REVIEWABLE_STATUSES.includes(item.status as (typeof REVIEWABLE_STATUSES)[number])) {
    res.status(409).json({ error: `item is not submitted or under review (current status: ${item.status})` })
    return
  }

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: { status: 'rejected', rejectionReason: reason },
    select: itemWithProposalSelect,
  })

  await logAdminAction(req.user!.id, 'reject_item', `${item.title ?? item.id} — reason: ${reason}`)

  await notifyNow(prisma, {
    userId: item.sellerId,
    type: 'listing_rejected',
    message: `Your listing "${item.title}" was rejected: ${reason}`,
    itemId: item.id,
  })

  res.json(withDisplayStatus(updated))
})

export default router

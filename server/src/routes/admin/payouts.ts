import { PayoutStatus } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'
import { logAdminAction } from '../../lib/auditLog.js'

const router = Router()

const payoutSelect = {
  id: true,
  grossAmount: true,
  commissionAmount: true,
  netAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  seller: { select: { id: true, name: true, email: true } },
  order: {
    select: {
      id: true,
      buyer: { select: { id: true, name: true } },
      auction: { select: { item: { select: { id: true, title: true } } } },
    },
  },
}

router.get('/', authenticate('admin'), async (_req, res) => {
  const payouts = await prisma.payout.findMany({
    select: payoutSelect,
    orderBy: { createdAt: 'desc' },
  })

  res.json(payouts)
})

router.patch<{ id: string }>('/:id/status', authenticate('admin'), async (req, res) => {
  const { status } = req.body ?? {}

  if (typeof status !== 'string' || !Object.values(PayoutStatus).includes(status as PayoutStatus)) {
    res.status(400).json({ error: `status must be one of: ${Object.values(PayoutStatus).join(', ')}` })
    return
  }

  const payout = await prisma.payout.findUnique({ where: { id: req.params.id } })
  if (!payout) {
    res.status(404).json({ error: 'payout not found' })
    return
  }

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: { status: status as PayoutStatus },
    select: payoutSelect,
  })

  await logAdminAction(
    req.user!.id,
    'update_payout_status',
    `${updated.seller.name} — ${updated.order.auction.item.title}: ${payout.status} → ${updated.status}`,
  )

  res.json(updated)
})

export default router

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { itemWithProposalSelect } from './items.js'

const router = Router()

router.get('/items', authenticate('seller'), async (req, res) => {
  const items = await prisma.item.findMany({
    where: { sellerId: req.user!.id },
    select: itemWithProposalSelect,
    orderBy: { title: 'asc' },
  })

  res.json(items)
})

router.get('/payouts', authenticate('seller'), async (req, res) => {
  const payouts = await prisma.payout.findMany({
    where: { sellerId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          id: true,
          auction: { select: { item: { select: { id: true, title: true } } } },
        },
      },
    },
  })

  res.json(payouts)
})

export default router

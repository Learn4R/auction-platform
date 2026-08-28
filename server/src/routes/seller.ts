import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { itemWithProposalSelect } from './items.js'

const router = Router()

const applicationSelect = {
  id: true,
  fullName: true,
  mobile: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  panNumber: true,
  bankAccountNumber: true,
  bankIFSC: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
}

router.post('/apply', authenticate(), async (req, res) => {
  const { fullName, mobile, address, city, state, pincode, panNumber, bankAccountNumber, bankIFSC } = req.body ?? {}

  const fields = { fullName, mobile, address, city, state, pincode, panNumber, bankAccountNumber, bankIFSC }
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value.trim()) {
      res.status(400).json({ error: `${key} is required` })
      return
    }
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerStatus: true } })
  if (user?.sellerStatus === 'approved') {
    res.status(409).json({ error: 'you are already an approved seller' })
    return
  }
  if (user?.sellerStatus === 'pending') {
    res.status(409).json({ error: 'you already have an application under review' })
    return
  }

  const [application] = await prisma.$transaction([
    prisma.sellerApplication.create({
      data: { userId: req.user!.id, ...fields },
      select: applicationSelect,
    }),
    prisma.user.update({ where: { id: req.user!.id }, data: { sellerStatus: 'pending' } }),
  ])

  res.status(201).json(application)
})

router.get('/application', authenticate(), async (req, res) => {
  const [user, application] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerStatus: true } }),
    prisma.sellerApplication.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: applicationSelect,
    }),
  ])

  res.json({ sellerStatus: user?.sellerStatus ?? 'none', application })
})

router.get('/dashboard-summary', authenticate(), async (req, res) => {
  const sellerId = req.user!.id

  const [user, application, activeAuctions, endedAuctions, payoutTotals] = await Promise.all([
    prisma.user.findUnique({ where: { id: sellerId }, select: { sellerStatus: true } }),
    prisma.sellerApplication.findFirst({
      where: { userId: sellerId },
      orderBy: { createdAt: 'desc' },
      select: applicationSelect,
    }),
    prisma.auction.count({ where: { status: 'live', item: { sellerId } } }),
    prisma.auction.findMany({ where: { status: 'ended', item: { sellerId } }, select: { winnerId: true } }),
    prisma.payout.groupBy({ by: ['status'], where: { sellerId }, _sum: { netAmount: true } }),
  ])

  const soldItems = endedAuctions.filter((a) => a.winnerId !== null).length
  const unsoldItems = endedAuctions.filter((a) => a.winnerId === null).length

  const earnings = payoutTotals
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p._sum.netAmount ?? 0), 0)
  const pendingPayout = payoutTotals
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + Number(p._sum.netAmount ?? 0), 0)

  res.json({
    sellerStatus: user?.sellerStatus ?? 'none',
    application,
    activeAuctions,
    soldItems,
    unsoldItems,
    earnings,
    pendingPayout,
  })
})

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

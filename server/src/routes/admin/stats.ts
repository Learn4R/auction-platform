import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

router.get('/', authenticate('admin'), async (_req, res) => {
  const [
    totalUsers,
    totalSellers,
    verifiedSellers,
    liveAuctions,
    upcomingAuctions,
    completedAuctions,
    paidTotals,
    pendingSellerApprovals,
    pendingPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'seller' } }),
    prisma.user.count({ where: { role: 'seller', verified: true } }),
    prisma.auction.count({ where: { status: 'live' } }),
    prisma.auction.count({ where: { status: 'upcoming' } }),
    prisma.auction.count({ where: { status: 'ended' } }),
    prisma.order.aggregate({
      where: { paymentStatus: 'paid' },
      _sum: { winningBid: true, buyerPremium: true },
    }),
    prisma.item.count({ where: { status: 'pending' } }),
    prisma.order.count({ where: { paymentStatus: 'pending' } }),
  ])

  res.json({
    totalUsers,
    totalSellers,
    verifiedSellers,
    liveAuctions,
    upcomingAuctions,
    completedAuctions,
    totalSalesValue: paidTotals._sum.winningBid ?? 0,
    platformRevenue: paidTotals._sum.buyerPremium ?? 0,
    pendingSellerApprovals,
    pendingPayments,
  })
})

export default router

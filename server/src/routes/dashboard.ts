import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Reuses the same Bid/Watchlist/Order rows that My Bids, Watchlist, and
// Orders already query — no separate stored counters to keep in sync.
router.get('/overview', authenticate(), async (req, res) => {
  const userId = req.user!.id

  const [bidGroups, watchlistCount, orders] = await Promise.all([
    prisma.bid.groupBy({ by: ['auctionId'], where: { userId } }),
    prisma.watchlist.count({ where: { userId } }),
    prisma.order.findMany({ where: { buyerId: userId }, select: { paymentStatus: true, totalAmount: true } }),
  ])

  let activeBids = 0
  let auctionsLost = 0

  if (bidGroups.length > 0) {
    const auctions = await prisma.auction.findMany({
      where: { id: { in: bidGroups.map((g) => g.auctionId) } },
      select: { status: true, winnerId: true },
    })
    for (const auction of auctions) {
      if (auction.status !== 'ended') activeBids++
      else if (auction.winnerId !== userId) auctionsLost++
    }
  }

  const pendingOrders = orders.filter((o) => o.paymentStatus === 'pending')

  res.json({
    activeBids,
    auctionsWon: orders.length,
    auctionsLost,
    watchlistCount,
    pendingPaymentsCount: pendingOrders.length,
    pendingPaymentsTotal: pendingOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
  })
})

export default router

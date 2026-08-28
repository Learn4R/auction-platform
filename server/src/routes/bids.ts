import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/mine', authenticate(), async (req, res) => {
  const userId = req.user!.id

  const grouped = await prisma.bid.groupBy({
    by: ['auctionId'],
    where: { userId },
    _max: { amount: true },
  })

  if (grouped.length === 0) {
    res.json([])
    return
  }

  const auctions = await prisma.auction.findMany({
    where: { id: { in: grouped.map((g) => g.auctionId) } },
    select: {
      id: true,
      currentBid: true,
      status: true,
      endTime: true,
      winnerId: true,
      winner: { select: { id: true, name: true } },
      item: {
        select: {
          id: true,
          title: true,
          images: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      bids: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { userId: true },
      },
    },
    orderBy: { endTime: 'desc' },
  })

  const myHighestByAuction = new Map(grouped.map((g) => [g.auctionId, g._max.amount]))

  const rows = auctions.map((auction) => {
    const leaderId = auction.status === 'ended' ? auction.winnerId : (auction.bids[0]?.userId ?? null)
    const isWinning = leaderId === userId
    return {
      auctionId: auction.id,
      item: auction.item,
      currentBid: auction.currentBid,
      status: auction.status,
      endTime: auction.endTime,
      myHighestBid: myHighestByAuction.get(auction.id),
      isWinning,
      isLost: auction.status === 'ended' && !isWinning,
      winner: auction.status === 'ended' ? auction.winner : null,
    }
  })

  res.json(rows)
})

export default router

import { prisma } from '../lib/prisma.js'
import { getBuyerPremiumPercent } from '../lib/settings.js'
import { getIO } from './io.js'

const CHECK_INTERVAL_MS = 5_000

async function endExpiredAuctions() {
  const now = new Date()
  const expired = await prisma.auction.findMany({
    where: { status: 'live', endTime: { lte: now } },
    select: { id: true },
  })

  for (const { id } of expired) {
    const result = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction in case a last-second bid extended it
      // between the findMany above and now.
      const auction = await tx.auction.findUnique({ where: { id } })
      if (!auction || auction.status !== 'live' || auction.endTime > new Date()) return null

      const winningBid = await tx.bid.findFirst({ where: { auctionId: id }, orderBy: { createdAt: 'desc' } })

      const updated = await tx.auction.update({
        where: { id },
        data: { status: 'ended', winnerId: winningBid?.userId ?? null },
      })

      const winner = winningBid
        ? await tx.user.findUnique({ where: { id: winningBid.userId }, select: { id: true, name: true } })
        : null

      if (winningBid) {
        const buyerPremiumPercent = await getBuyerPremiumPercent(tx)
        const winningBidAmount = Number(winningBid.amount)
        const buyerPremium = Math.round(winningBidAmount * (buyerPremiumPercent / 100) * 100) / 100
        const totalAmount = winningBidAmount + buyerPremium

        await tx.order.create({
          data: {
            auctionId: id,
            buyerId: winningBid.userId,
            winningBid: winningBidAmount,
            buyerPremium,
            totalAmount,
          },
        })
      }

      return { auction: updated, winner }
    })

    if (result) {
      getIO().to(id).emit('auction:ended', {
        winner: result.winner,
        endedAt: result.auction.endTime,
      })
    }
  }
}

async function startDueAuctions() {
  const now = new Date()
  const due = await prisma.auction.findMany({
    where: { status: 'upcoming', startTime: { lte: now } },
    select: { id: true, startTime: true },
  })

  for (const { id, startTime } of due) {
    await prisma.auction.update({ where: { id }, data: { status: 'live' } })
    getIO().to(id).emit('auction:started', { startTime })
  }
}

export function startAuctionScheduler() {
  const interval = setInterval(() => {
    startDueAuctions().catch((err) => console.error('startDueAuctions failed:', err))
    endExpiredAuctions().catch((err) => console.error('endExpiredAuctions failed:', err))
  }, CHECK_INTERVAL_MS)

  return () => clearInterval(interval)
}

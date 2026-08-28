import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { bidLimiter } from '../middleware/rateLimit.js'
import { BidError, placeBid, setMaxBid } from '../realtime/bidding.js'

const router = Router()

router.get('/reminders/mine', authenticate(), async (req, res) => {
  const reminders = await prisma.reminder.findMany({
    where: { userId: req.user!.id },
    select: { auctionId: true },
  })

  res.json(reminders.map((r) => r.auctionId))
})

router.post<{ id: string }>('/:id/remind', authenticate(), async (req, res) => {
  const auctionId = req.params.id
  const userId = req.user!.id

  const auction = await prisma.auction.findUnique({ where: { id: auctionId } })
  if (!auction) {
    res.status(404).json({ error: 'auction not found' })
    return
  }
  if (auction.status !== 'upcoming') {
    res.status(409).json({ error: 'reminders can only be set for upcoming auctions' })
    return
  }

  const existing = await prisma.reminder.findUnique({
    where: { userId_auctionId: { userId, auctionId } },
  })

  if (existing) {
    await prisma.reminder.delete({ where: { userId_auctionId: { userId, auctionId } } })
    res.json({ reminding: false })
    return
  }

  await prisma.reminder.create({ data: { userId, auctionId } })
  res.json({ reminding: true })
})

router.post<{ id: string }>('/:id/bids', authenticate(), bidLimiter, async (req, res) => {
  const { amount } = req.body ?? {}
  const amountNum = Number(amount)

  try {
    const result = await placeBid(req.params.id, req.user!.id, amountNum)
    res.status(201).json(result)
  } catch (error) {
    if (error instanceof BidError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    throw error
  }
})

router.post<{ id: string }>('/:id/max-bid', authenticate(), bidLimiter, async (req, res) => {
  const { amount } = req.body ?? {}
  const amountNum = Number(amount)

  try {
    const result = await setMaxBid(req.params.id, req.user!.id, amountNum)
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof BidError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    throw error
  }
})

export default router

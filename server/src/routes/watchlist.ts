import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { watchlistLimiter } from '../middleware/rateLimit.js'
import { itemSummarySelect } from './items.js'

const router = Router()

router.get('/', authenticate(), async (req, res) => {
  const entries = await prisma.watchlist.findMany({
    where: { userId: req.user!.id },
    select: { item: { select: itemSummarySelect } },
  })

  res.json(entries.map((e) => e.item))
})

router.post<{ itemId: string }>('/:itemId', authenticate(), watchlistLimiter, async (req, res) => {
  const { itemId } = req.params
  const userId = req.user!.id

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } })
  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }

  const existing = await prisma.watchlist.findUnique({
    where: { userId_itemId: { userId, itemId } },
  })

  if (existing) {
    await prisma.watchlist.delete({ where: { userId_itemId: { userId, itemId } } })
    res.json({ watchlisted: false })
    return
  }

  await prisma.watchlist.create({ data: { userId, itemId } })
  res.json({ watchlisted: true })
})

export default router

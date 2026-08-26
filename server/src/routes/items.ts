import { AuctionStatus, Prisma } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

const itemSummarySelect = {
  id: true,
  title: true,
  description: true,
  year: true,
  material: true,
  condition: true,
  images: true,
  status: true,
  category: { select: { id: true, name: true, slug: true } },
  seller: { select: { id: true, name: true } },
  auction: {
    select: {
      id: true,
      startingBid: true,
      currentBid: true,
      bidIncrement: true,
      startTime: true,
      endTime: true,
      status: true,
      _count: { select: { bids: true } },
    },
  },
} satisfies Prisma.ItemSelect

router.get('/', async (req, res) => {
  const { status, category } = req.query

  const where: Prisma.ItemWhereInput = { status: 'approved' }

  if (category !== undefined) {
    if (typeof category !== 'string' || !category.trim()) {
      res.status(400).json({ error: 'category must be a non-empty string' })
      return
    }
    where.category = { slug: category }
  }

  if (status !== undefined) {
    if (typeof status !== 'string' || !Object.values(AuctionStatus).includes(status as AuctionStatus)) {
      res.status(400).json({ error: `status must be one of: ${Object.values(AuctionStatus).join(', ')}` })
      return
    }
    where.auction = { status: status as AuctionStatus }
  }

  const items = await prisma.item.findMany({
    where,
    select: itemSummarySelect,
    orderBy: { title: 'asc' },
  })

  res.json(items)
})

router.get('/:id', async (req, res) => {
  const item = await prisma.item.findFirst({
    where: { id: req.params.id, status: 'approved' },
    select: {
      ...itemSummarySelect,
      auction: {
        select: {
          ...itemSummarySelect.auction.select,
          bids: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              createdAt: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })

  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }

  res.json(item)
})

export default router

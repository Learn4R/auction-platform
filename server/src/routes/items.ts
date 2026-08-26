import { AuctionStatus, Prisma } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

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

export const itemWithProposalSelect = {
  ...itemSummarySelect,
  proposedStartingBid: true,
  proposedBidIncrement: true,
  proposedStartTime: true,
  proposedEndTime: true,
  rejectionReason: true,
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

router.post('/', authenticate('seller', 'admin'), async (req, res) => {
  const {
    title,
    description,
    categoryId,
    year,
    material,
    condition,
    images,
    startingBid,
    bidIncrement,
    startTime,
    endTime,
  } = req.body ?? {}

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title is required' })
    return
  }
  if (typeof description !== 'string' || !description.trim()) {
    res.status(400).json({ error: 'description is required' })
    return
  }
  if (typeof categoryId !== 'string' || !categoryId.trim()) {
    res.status(400).json({ error: 'categoryId is required' })
    return
  }
  if (year !== undefined && year !== null && !Number.isInteger(year)) {
    res.status(400).json({ error: 'year must be an integer' })
    return
  }
  if (images !== undefined && (!Array.isArray(images) || !images.every((i) => typeof i === 'string'))) {
    res.status(400).json({ error: 'images must be an array of strings' })
    return
  }

  const startingBidNum = Number(startingBid)
  const bidIncrementNum = Number(bidIncrement)
  if (!startingBid || !Number.isFinite(startingBidNum) || startingBidNum <= 0) {
    res.status(400).json({ error: 'startingBid must be a positive number' })
    return
  }
  if (!bidIncrement || !Number.isFinite(bidIncrementNum) || bidIncrementNum <= 0) {
    res.status(400).json({ error: 'bidIncrement must be a positive number' })
    return
  }

  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    res.status(400).json({ error: 'startTime and endTime must be valid dates' })
    return
  }
  if (startDate >= endDate) {
    res.status(400).json({ error: 'startTime must be before endTime' })
    return
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) {
    res.status(400).json({ error: 'categoryId does not match an existing category' })
    return
  }

  const item = await prisma.item.create({
    data: {
      title,
      description,
      categoryId,
      year: year ?? null,
      material: material ?? null,
      condition: condition ?? null,
      images: images ?? [],
      sellerId: req.user!.id,
      status: 'pending',
      proposedStartingBid: startingBidNum,
      proposedBidIncrement: bidIncrementNum,
      proposedStartTime: startDate,
      proposedEndTime: endDate,
    },
    select: itemWithProposalSelect,
  })

  res.status(201).json(item)
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

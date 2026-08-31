import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

type SortKey = 'recent' | 'priceHigh' | 'priceLow'

router.get('/', async (req, res) => {
  const { category, search, minPrice, maxPrice, dateFrom, dateTo, sort } = req.query

  const where: Prisma.ItemWhereInput = {
    status: 'approved',
    auction: { status: 'ended', currentBid: { not: null } },
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || !category.trim()) {
      res.status(400).json({ error: 'category must be a non-empty string' })
      return
    }
    where.category = { slug: category }
  }

  if (search !== undefined) {
    if (typeof search !== 'string' || !search.trim()) {
      res.status(400).json({ error: 'search must be a non-empty string' })
      return
    }
    where.title = { contains: search, mode: 'insensitive' }
  }

  const auctionFilter: Prisma.AuctionWhereInput = { status: 'ended', currentBid: { not: null } }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: Prisma.DecimalFilter = {}
    if (minPrice !== undefined) {
      const min = Number(minPrice)
      if (!Number.isFinite(min) || min < 0) {
        res.status(400).json({ error: 'minPrice must be a non-negative number' })
        return
      }
      priceFilter.gte = min
    }
    if (maxPrice !== undefined) {
      const max = Number(maxPrice)
      if (!Number.isFinite(max) || max < 0) {
        res.status(400).json({ error: 'maxPrice must be a non-negative number' })
        return
      }
      priceFilter.lte = max
    }
    auctionFilter.currentBid = priceFilter
  }

  if (dateFrom !== undefined || dateTo !== undefined) {
    const endTimeFilter: Prisma.DateTimeFilter = {}
    if (dateFrom !== undefined) {
      const from = new Date(String(dateFrom))
      if (Number.isNaN(from.getTime())) {
        res.status(400).json({ error: 'dateFrom must be a valid date' })
        return
      }
      endTimeFilter.gte = from
    }
    if (dateTo !== undefined) {
      const to = new Date(String(dateTo))
      if (Number.isNaN(to.getTime())) {
        res.status(400).json({ error: 'dateTo must be a valid date' })
        return
      }
      endTimeFilter.lte = to
    }
    auctionFilter.endTime = endTimeFilter
  }

  where.auction = auctionFilter

  let orderBy: Prisma.ItemOrderByWithRelationInput = { auction: { endTime: 'desc' } }
  if (sort !== undefined) {
    const validSorts: SortKey[] = ['recent', 'priceHigh', 'priceLow']
    if (typeof sort !== 'string' || !validSorts.includes(sort as SortKey)) {
      res.status(400).json({ error: `sort must be one of: ${validSorts.join(', ')}` })
      return
    }
    if (sort === 'priceHigh') orderBy = { auction: { currentBid: 'desc' } }
    else if (sort === 'priceLow') orderBy = { auction: { currentBid: 'asc' } }
  }

  const items = await prisma.item.findMany({
    where,
    orderBy,
    select: {
      id: true,
      title: true,
      description: true,
      year: true,
      material: true,
      condition: true,
      denomination: true,
      rulerAuthority: true,
      period: true,
      certificateNumber: true,
      gradingCompany: true,
      images: true,
      category: { select: { id: true, name: true, slug: true } },
      seller: { select: { id: true, name: true } },
      auction: {
        select: {
          currentBid: true,
          endTime: true,
          _count: { select: { bids: true } },
        },
      },
    },
  })

  // Deliberately excludes the winner/buyer entirely — this is a public
  // results archive, not a record of who bought what.
  res.json(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      year: item.year,
      material: item.material,
      condition: item.condition,
      denomination: item.denomination,
      rulerAuthority: item.rulerAuthority,
      period: item.period,
      certificateNumber: item.certificateNumber,
      gradingCompany: item.gradingCompany,
      images: item.images,
      category: item.category,
      seller: item.seller,
      hammerPrice: item.auction!.currentBid,
      bidsCount: item.auction!._count.bids,
      endedAt: item.auction!.endTime,
    })),
  )
})

export default router

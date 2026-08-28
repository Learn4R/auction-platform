import { AuctionStatus, Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { deleteItemImages, uploadItemImage } from '../lib/supabaseStorage.js'

const router = Router()

export const MAX_IMAGES = 6
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'))
      return
    }
    cb(null, true)
  },
})

export function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  upload.array('images', MAX_IMAGES)(req, res, (err: unknown) => {
    if (!err) {
      next()
      return
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: `Each image must be ${MAX_IMAGE_BYTES / (1024 * 1024)}MB or smaller` })
        return
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({ error: `You can upload up to ${MAX_IMAGES} images` })
        return
      }
      res.status(400).json({ error: err.message })
      return
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Image upload failed' })
  })
}

export const itemSummarySelect = {
  id: true,
  title: true,
  description: true,
  year: true,
  material: true,
  condition: true,
  denomination: true,
  mint: true,
  rulerAuthority: true,
  period: true,
  weight: true,
  diameter: true,
  grade: true,
  certificateNumber: true,
  gradingCompany: true,
  provenance: true,
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
      winner: { select: { id: true, name: true } },
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
  changesRequestedNote: true,
} satisfies Prisma.ItemSelect

type ItemWithAuction = {
  status: string
  auction: { status: string; winner: { id: string; name: string } | null } | null
}

// "Scheduled"/"Live"/"Sold"/"Unsold" for approved items, derived from the
// existing auction data rather than stored separately.
export function withDisplayStatus<T extends ItemWithAuction>(item: T): T & { displayStatus: string | null } {
  let displayStatus: string | null = null
  if (item.status === 'approved' && item.auction) {
    if (item.auction.status === 'upcoming') displayStatus = 'Scheduled'
    else if (item.auction.status === 'live') displayStatus = 'Live'
    else if (item.auction.status === 'ended') displayStatus = item.auction.winner ? 'Sold' : 'Unsold'
  }
  return { ...item, displayStatus }
}

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

  res.json(items.map(withDisplayStatus))
})

router.post('/', authenticate(), handleImageUpload, async (req, res) => {
  if (req.user!.role !== 'admin') {
    const seller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerStatus: true } })
    if (seller?.sellerStatus !== 'approved') {
      res.status(403).json({ error: 'You must be an approved seller to submit items. Apply to sell from your dashboard.' })
      return
    }
  }

  const {
    title,
    description,
    categoryId,
    year,
    material,
    condition,
    denomination,
    mint,
    rulerAuthority,
    period,
    weight,
    diameter,
    grade,
    certificateNumber,
    gradingCompany,
    provenance,
    startingBid,
    bidIncrement,
    startTime,
    endTime,
  } = req.body ?? {}
  const files = (req.files as Express.Multer.File[] | undefined) ?? []

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

  let yearNum: number | null = null
  if (year !== undefined && year !== null && year !== '') {
    yearNum = Number(year)
    if (!Number.isInteger(yearNum)) {
      res.status(400).json({ error: 'year must be an integer' })
      return
    }
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

  const uploaded = await Promise.all(
    files.map((file) => uploadItemImage(file.buffer, file.mimetype, file.originalname)),
  ).catch(async (err) => {
    res.status(500).json({ error: 'Failed to upload one or more images' })
    console.error(err)
    return null
  })
  if (uploaded === null) return

  try {
    const item = await prisma.item.create({
      data: {
        title,
        description,
        categoryId,
        year: yearNum,
        material: material || null,
        condition: condition || null,
        denomination: denomination || null,
        mint: mint || null,
        rulerAuthority: rulerAuthority || null,
        period: period || null,
        weight: weight || null,
        diameter: diameter || null,
        grade: grade || null,
        certificateNumber: certificateNumber || null,
        gradingCompany: gradingCompany || null,
        provenance: provenance || null,
        images: uploaded.map((u) => u.url),
        sellerId: req.user!.id,
        status: 'submitted',
        proposedStartingBid: startingBidNum,
        proposedBidIncrement: bidIncrementNum,
        proposedStartTime: startDate,
        proposedEndTime: endDate,
      },
      select: itemWithProposalSelect,
    })

    res.status(201).json(item)
  } catch (err) {
    // Roll back any uploaded images if the item row couldn't be created.
    await deleteItemImages(uploaded.map((u) => u.path))
    throw err
  }
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
              isProxy: true,
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

  res.json(withDisplayStatus(item))
})

export default router

import { AuctionStatus, Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma.js'
import { isGenuineImage } from '../lib/imageValidation.js'
import { authenticate } from '../middleware/auth.js'
import { itemLimiter } from '../middleware/rateLimit.js'
import { deleteItemImages, uploadItemImage } from '../lib/supabaseStorage.js'

const router = Router()

export const MAX_IMAGES = 6
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// SVG is rejected outright regardless of what mimetype the client declares —
// it's XML, not a raster image, and can carry executable script content.
// Every other declared image/* mimetype still gets its actual bytes
// verified below, since a client can lie about mimetype either way.
const BLOCKED_MIME_TYPES = new Set(['image/svg+xml'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/') || BLOCKED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'))
      return
    }
    cb(null, true)
  },
})

export function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  upload.array('images', MAX_IMAGES)(req, res, (err: unknown) => {
    if (err) {
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
      return
    }

    // Belt-and-suspenders past the mimetype check above: verify each file's
    // actual byte signature matches a genuine raster image format. Catches
    // e.g. an SVG (or any other non-image file) renamed with a forged
    // image/jpeg Content-Type, which fileFilter alone can't detect.
    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    for (const file of files) {
      if (!isGenuineImage(file.buffer)) {
        res.status(400).json({ error: `"${file.originalname}" is not a valid JPEG, PNG, GIF, or WebP image` })
        return
      }
    }

    next()
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
  seller: { select: { id: true, name: true, verified: true } },
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
// existing auction data rather than stored separately. isReviewed likewise
// reuses the item's own status rather than a separate stored flag — once an
// item reaches 'approved' in this codebase's moderation lifecycle it never
// transitions back out, so "is or has been approved" reduces to a direct
// status check.
export function withDisplayStatus<T extends ItemWithAuction>(
  item: T,
): T & { displayStatus: string | null; isReviewed: boolean } {
  let displayStatus: string | null = null
  if (item.status === 'approved' && item.auction) {
    if (item.auction.status === 'upcoming') displayStatus = 'Scheduled'
    else if (item.auction.status === 'live') displayStatus = 'Live'
    else if (item.auction.status === 'ended') displayStatus = item.auction.winner ? 'Sold' : 'Unsold'
  }
  return { ...item, displayStatus, isReviewed: item.status === 'approved' }
}

function stringFilter(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}

router.get('/', async (req, res) => {
  const { status, category, year, period, material, condition, grade, hasCertificate } = req.query

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

  try {
    if (year !== undefined) {
      if (typeof year !== 'string' || !year.trim() || !Number.isInteger(Number(year))) {
        res.status(400).json({ error: 'year must be an integer' })
        return
      }
      where.year = Number(year)
    }
    const period_ = stringFilter(period, 'period')
    if (period_ !== undefined) where.period = period_
    const material_ = stringFilter(material, 'material')
    if (material_ !== undefined) where.material = material_
    const condition_ = stringFilter(condition, 'condition')
    if (condition_ !== undefined) where.condition = condition_
    const grade_ = stringFilter(grade, 'grade')
    if (grade_ !== undefined) where.grade = grade_
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'invalid filter' })
    return
  }

  if (hasCertificate !== undefined) {
    if (hasCertificate !== 'true') {
      res.status(400).json({ error: 'hasCertificate must be "true"' })
      return
    }
    where.certificateNumber = { not: null, notIn: [''] }
  }

  const items = await prisma.item.findMany({
    where,
    select: itemSummarySelect,
    orderBy: { title: 'asc' },
  })

  res.json(items.map(withDisplayStatus))
})

// Distinct real values from approved items, so filter dropdowns only ever
// offer options that actually match something — never a guessed fixed list.
router.get('/filter-options', async (_req, res) => {
  const items = await prisma.item.findMany({
    where: { status: 'approved' },
    select: { year: true, period: true, material: true, condition: true, grade: true },
  })

  function distinctStrings(values: (string | null)[]) {
    return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ''))].sort((a, b) => a.localeCompare(b))
  }

  const years = [...new Set(items.map((i) => i.year).filter((y): y is number => y !== null))].sort((a, b) => b - a)

  res.json({
    year: years,
    period: distinctStrings(items.map((i) => i.period)),
    material: distinctStrings(items.map((i) => i.material)),
    condition: distinctStrings(items.map((i) => i.condition)),
    grade: distinctStrings(items.map((i) => i.grade)),
  })
})

router.post('/', authenticate(), itemLimiter, handleImageUpload, async (req, res) => {
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

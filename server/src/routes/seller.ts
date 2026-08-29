import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { itemLimiter } from '../middleware/rateLimit.js'
import { deleteItemImages, storagePathFromUrl, uploadItemImage } from '../lib/supabaseStorage.js'
import { handleImageUpload, itemWithProposalSelect, withDisplayStatus } from './items.js'

const router = Router()

const EDITABLE_STATUSES = ['draft', 'rejected', 'changes_requested'] as const

async function requireApprovedSeller(req: import('express').Request, res: import('express').Response): Promise<boolean> {
  if (req.user!.role === 'admin') return true
  const seller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerStatus: true } })
  if (seller?.sellerStatus !== 'approved') {
    res.status(403).json({ error: 'You must be an approved seller to manage listings. Apply to sell from your dashboard.' })
    return false
  }
  return true
}

const NUMISMATIC_TEXT_FIELDS = [
  'title',
  'description',
  'material',
  'condition',
  'denomination',
  'mint',
  'rulerAuthority',
  'period',
  'weight',
  'diameter',
  'grade',
  'certificateNumber',
  'gradingCompany',
  'provenance',
] as const

function parseDraftFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}

  for (const key of NUMISMATIC_TEXT_FIELDS) {
    const value = body[key]
    if (typeof value === 'string') data[key] = value.trim() ? value : null
  }

  if (typeof body.categoryId === 'string' && body.categoryId.trim()) data.categoryId = body.categoryId
  else if (body.categoryId === '') data.categoryId = null

  if (body.year !== undefined) {
    if (body.year === '' || body.year === null) data.year = null
    else {
      const yearNum = Number(body.year)
      if (!Number.isInteger(yearNum)) return { error: 'year must be an integer' }
      data.year = yearNum
    }
  }

  if (body.startingBid !== undefined) {
    if (body.startingBid === '' || body.startingBid === null) data.proposedStartingBid = null
    else {
      const n = Number(body.startingBid)
      if (!Number.isFinite(n) || n <= 0) return { error: 'startingBid must be a positive number' }
      data.proposedStartingBid = n
    }
  }
  if (body.bidIncrement !== undefined) {
    if (body.bidIncrement === '' || body.bidIncrement === null) data.proposedBidIncrement = null
    else {
      const n = Number(body.bidIncrement)
      if (!Number.isFinite(n) || n <= 0) return { error: 'bidIncrement must be a positive number' }
      data.proposedBidIncrement = n
    }
  }
  if (body.startTime !== undefined) {
    if (body.startTime === '' || body.startTime === null) data.proposedStartTime = null
    else {
      const d = new Date(body.startTime as string)
      if (Number.isNaN(d.getTime())) return { error: 'startTime must be a valid date' }
      data.proposedStartTime = d
    }
  }
  if (body.endTime !== undefined) {
    if (body.endTime === '' || body.endTime === null) data.proposedEndTime = null
    else {
      const d = new Date(body.endTime as string)
      if (Number.isNaN(d.getTime())) return { error: 'endTime must be a valid date' }
      data.proposedEndTime = d
    }
  }
  if (
    data.proposedStartTime instanceof Date &&
    data.proposedEndTime instanceof Date &&
    data.proposedStartTime >= data.proposedEndTime
  ) {
    return { error: 'startTime must be before endTime' }
  }

  return { data }
}

const applicationSelect = {
  id: true,
  fullName: true,
  mobile: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  panNumber: true,
  bankAccountNumber: true,
  bankIFSC: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
}

router.post('/apply', authenticate(), async (req, res) => {
  const { fullName, mobile, address, city, state, pincode, panNumber, bankAccountNumber, bankIFSC } = req.body ?? {}

  const fields = { fullName, mobile, address, city, state, pincode, panNumber, bankAccountNumber, bankIFSC }
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value.trim()) {
      res.status(400).json({ error: `${key} is required` })
      return
    }
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerStatus: true } })
  if (user?.sellerStatus === 'approved') {
    res.status(409).json({ error: 'you are already an approved seller' })
    return
  }
  if (user?.sellerStatus === 'pending') {
    res.status(409).json({ error: 'you already have an application under review' })
    return
  }

  const [application] = await prisma.$transaction([
    prisma.sellerApplication.create({
      data: { userId: req.user!.id, ...fields },
      select: applicationSelect,
    }),
    prisma.user.update({ where: { id: req.user!.id }, data: { sellerStatus: 'pending' } }),
  ])

  res.status(201).json(application)
})

router.get('/application', authenticate(), async (req, res) => {
  const [user, application] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerStatus: true } }),
    prisma.sellerApplication.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: applicationSelect,
    }),
  ])

  res.json({ sellerStatus: user?.sellerStatus ?? 'none', application })
})

router.get('/dashboard-summary', authenticate(), async (req, res) => {
  const sellerId = req.user!.id

  const [user, application, activeAuctions, endedAuctions, payoutTotals] = await Promise.all([
    prisma.user.findUnique({ where: { id: sellerId }, select: { sellerStatus: true } }),
    prisma.sellerApplication.findFirst({
      where: { userId: sellerId },
      orderBy: { createdAt: 'desc' },
      select: applicationSelect,
    }),
    prisma.auction.count({ where: { status: 'live', item: { sellerId } } }),
    prisma.auction.findMany({ where: { status: 'ended', item: { sellerId } }, select: { winnerId: true } }),
    prisma.payout.groupBy({ by: ['status'], where: { sellerId }, _sum: { netAmount: true } }),
  ])

  const soldItems = endedAuctions.filter((a) => a.winnerId !== null).length
  const unsoldItems = endedAuctions.filter((a) => a.winnerId === null).length

  const earnings = payoutTotals
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p._sum.netAmount ?? 0), 0)
  const pendingPayout = payoutTotals
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + Number(p._sum.netAmount ?? 0), 0)

  res.json({
    sellerStatus: user?.sellerStatus ?? 'none',
    application,
    activeAuctions,
    soldItems,
    unsoldItems,
    earnings,
    pendingPayout,
  })
})

router.post('/items/draft', authenticate(), itemLimiter, handleImageUpload, async (req, res) => {
  if (!(await requireApprovedSeller(req, res))) return

  const parsed = parseDraftFields(req.body ?? {})
  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  if (parsed.data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId as string } })
    if (!category) {
      res.status(400).json({ error: 'categoryId does not match an existing category' })
      return
    }
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? []
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
        ...parsed.data,
        images: uploaded.map((u) => u.url),
        sellerId: req.user!.id,
        status: 'draft',
      },
      select: itemWithProposalSelect,
    })

    res.status(201).json(withDisplayStatus(item))
  } catch (err) {
    await deleteItemImages(uploaded.map((u) => u.path))
    throw err
  }
})

router.patch<{ id: string }>('/items/:id', authenticate(), itemLimiter, handleImageUpload, async (req, res) => {
  if (!(await requireApprovedSeller(req, res))) return

  const item = await prisma.item.findUnique({ where: { id: req.params.id } })
  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }
  if (item.sellerId !== req.user!.id) {
    res.status(403).json({ error: 'this is not your listing' })
    return
  }
  if (!EDITABLE_STATUSES.includes(item.status as (typeof EDITABLE_STATUSES)[number])) {
    res.status(409).json({ error: `this listing can't be edited in its current status (${item.status})` })
    return
  }

  const body = req.body ?? {}
  const parsed = parseDraftFields(body)
  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  if (parsed.data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId as string } })
    if (!category) {
      res.status(400).json({ error: 'categoryId does not match an existing category' })
      return
    }
  }

  let keepImages: string[] = item.images
  if (typeof body.keepImages === 'string') {
    try {
      const parsedKeep = JSON.parse(body.keepImages)
      if (Array.isArray(parsedKeep) && parsedKeep.every((v) => typeof v === 'string')) {
        keepImages = parsedKeep.filter((url) => item.images.includes(url))
      }
    } catch {
      // ignore malformed keepImages, fall back to current images
    }
  }
  const removedImages = item.images.filter((url) => !keepImages.includes(url))

  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const uploaded = await Promise.all(
    files.map((file) => uploadItemImage(file.buffer, file.mimetype, file.originalname)),
  ).catch(async (err) => {
    res.status(500).json({ error: 'Failed to upload one or more images' })
    console.error(err)
    return null
  })
  if (uploaded === null) return

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: {
      ...parsed.data,
      images: [...keepImages, ...uploaded.map((u) => u.url)],
    },
    select: itemWithProposalSelect,
  })

  if (removedImages.length > 0) {
    const paths = removedImages.map(storagePathFromUrl).filter((p): p is string => !!p)
    await deleteItemImages(paths).catch(() => {})
  }

  res.json(withDisplayStatus(updated))
})

router.post<{ id: string }>('/items/:id/resubmit', authenticate(), async (req, res) => {
  if (!(await requireApprovedSeller(req, res))) return

  const item = await prisma.item.findUnique({ where: { id: req.params.id } })
  if (!item) {
    res.status(404).json({ error: 'item not found' })
    return
  }
  if (item.sellerId !== req.user!.id) {
    res.status(403).json({ error: 'this is not your listing' })
    return
  }
  // Drafts are submitted for the first time through this same endpoint —
  // completing a draft and fixing feedback after rejected/changes_requested
  // are both just "this listing is ready for review" from the seller's side.
  if (item.status !== 'draft' && item.status !== 'rejected' && item.status !== 'changes_requested') {
    res.status(409).json({ error: `only a draft, rejected, or changes-requested listing can be submitted (current status: ${item.status})` })
    return
  }
  if (
    !item.title?.trim() ||
    !item.description?.trim() ||
    !item.categoryId ||
    item.images.length === 0 ||
    item.proposedStartingBid === null ||
    item.proposedBidIncrement === null ||
    item.proposedStartTime === null ||
    item.proposedEndTime === null
  ) {
    res.status(400).json({ error: 'complete every step before resubmitting: title, description, category, at least one photo, and auction settings are all required' })
    return
  }

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: { status: 'submitted', rejectionReason: null, changesRequestedNote: null },
    select: itemWithProposalSelect,
  })

  res.json(withDisplayStatus(updated))
})

router.get('/items', authenticate('seller'), async (req, res) => {
  const items = await prisma.item.findMany({
    where: { sellerId: req.user!.id },
    select: itemWithProposalSelect,
    orderBy: { title: 'asc' },
  })

  res.json(items.map(withDisplayStatus))
})

router.get('/payouts', authenticate('seller'), async (req, res) => {
  const payouts = await prisma.payout.findMany({
    where: { sellerId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          id: true,
          auction: { select: { item: { select: { id: true, title: true } } } },
        },
      },
    },
  })

  res.json(payouts)
})

export default router

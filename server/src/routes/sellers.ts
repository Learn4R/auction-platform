import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get<{ id: string }>('/:id/reviews', async (req, res) => {
  const seller = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } })
  if (!seller || seller.role !== 'seller') {
    res.status(404).json({ error: 'seller not found' })
    return
  }

  const [reviews, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.review.aggregate({ where: { sellerId: seller.id }, _avg: { rating: true }, _count: true }),
  ])

  res.json({
    averageRating: aggregate._avg.rating,
    reviewCount: aggregate._count,
    reviews,
  })
})

export default router

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { items: { where: { status: 'approved' } } } },
    },
    orderBy: { name: 'asc' },
  })

  res.json(
    categories.map(({ _count, ...category }) => ({
      ...category,
      itemCount: _count.items,
    })),
  )
})

export default router

import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

router.get('/', authenticate('admin'), async (_req, res) => {
  const sellers = await prisma.user.findMany({
    where: { role: 'seller' },
    select: {
      id: true,
      name: true,
      email: true,
      verified: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(sellers.map(({ _count, ...s }) => ({ ...s, itemCount: _count.items })))
})

router.patch<{ id: string }>('/:id/verify', authenticate('admin'), async (req, res) => {
  const seller = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!seller || seller.role !== 'seller') {
    res.status(404).json({ error: 'seller not found' })
    return
  }

  const updated = await prisma.user.update({
    where: { id: seller.id },
    data: { verified: !seller.verified },
    select: { id: true, name: true, email: true, verified: true, createdAt: true },
  })

  res.json(updated)
})

export default router

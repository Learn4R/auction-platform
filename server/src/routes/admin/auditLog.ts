import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

router.get('/', authenticate('admin'), async (_req, res) => {
  const entries = await prisma.adminAction.findMany({
    select: {
      id: true,
      action: true,
      target: true,
      createdAt: true,
      admin: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(entries)
})

export default router

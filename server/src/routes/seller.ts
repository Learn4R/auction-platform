import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { itemWithProposalSelect } from './items.js'

const router = Router()

router.get('/items', authenticate('seller'), async (req, res) => {
  const items = await prisma.item.findMany({
    where: { sellerId: req.user!.id },
    select: itemWithProposalSelect,
    orderBy: { title: 'asc' },
  })

  res.json(items)
})

export default router

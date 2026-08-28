import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get<{ slug: string }>('/:slug', async (req, res) => {
  const page = await prisma.legalPage.findUnique({ where: { slug: req.params.slug } })
  if (!page) {
    res.status(404).json({ error: 'legal page not found' })
    return
  }

  res.json(page)
})

export default router

import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getPlatformSettings } from '../../lib/settings.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

router.get('/', authenticate('admin'), async (_req, res) => {
  const settings = await getPlatformSettings(prisma)
  res.json({ buyerPremiumPercent: settings.buyerPremiumPercent })
})

router.patch('/', authenticate('admin'), async (req, res) => {
  const { buyerPremiumPercent } = req.body ?? {}
  const value = Number(buyerPremiumPercent)

  if (!Number.isFinite(value) || value < 0 || value > 100) {
    res.status(400).json({ error: 'buyerPremiumPercent must be a number between 0 and 100' })
    return
  }

  const settings = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    update: { buyerPremiumPercent: value },
    create: { id: 'singleton', buyerPremiumPercent: value },
  })

  res.json({ buyerPremiumPercent: settings.buyerPremiumPercent })
})

export default router

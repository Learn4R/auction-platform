import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getPlatformSettings } from '../../lib/settings.js'
import { authenticate } from '../../middleware/auth.js'
import { logAdminAction } from '../../lib/auditLog.js'

const router = Router()

router.get('/', authenticate('admin'), async (_req, res) => {
  const settings = await getPlatformSettings(prisma)
  res.json({
    buyerPremiumPercent: settings.buyerPremiumPercent,
    sellerCommissionPercent: settings.sellerCommissionPercent,
  })
})

router.patch('/', authenticate('admin'), async (req, res) => {
  const { buyerPremiumPercent, sellerCommissionPercent } = req.body ?? {}

  const before = await getPlatformSettings(prisma)
  const data: { buyerPremiumPercent?: number; sellerCommissionPercent?: number } = {}
  const changes: string[] = []

  if (buyerPremiumPercent !== undefined) {
    const value = Number(buyerPremiumPercent)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      res.status(400).json({ error: 'buyerPremiumPercent must be a number between 0 and 100' })
      return
    }
    data.buyerPremiumPercent = value
    changes.push(`Buyer premium: ${before.buyerPremiumPercent}% → ${value}%`)
  }

  if (sellerCommissionPercent !== undefined) {
    const value = Number(sellerCommissionPercent)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      res.status(400).json({ error: 'sellerCommissionPercent must be a number between 0 and 100' })
      return
    }
    data.sellerCommissionPercent = value
    changes.push(`Seller commission: ${before.sellerCommissionPercent}% → ${value}%`)
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'buyerPremiumPercent or sellerCommissionPercent is required' })
    return
  }

  const settings = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  })

  await logAdminAction(req.user!.id, 'update_settings', changes.join('; '))

  res.json({
    buyerPremiumPercent: settings.buyerPremiumPercent,
    sellerCommissionPercent: settings.sellerCommissionPercent,
  })
})

export default router

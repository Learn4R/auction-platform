import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate(), async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  res.json(notifications)
})

router.patch<{ id: string }>('/:id/read', authenticate(), async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })

  if (!notification || notification.userId !== req.user!.id) {
    res.status(404).json({ error: 'notification not found' })
    return
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { read: true },
  })

  res.json(updated)
})

export default router

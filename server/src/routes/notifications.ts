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

router.get('/all', authenticate(), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = 20
  const userId = req.user!.id

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: { userId } }),
  ])

  res.json({ notifications, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
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

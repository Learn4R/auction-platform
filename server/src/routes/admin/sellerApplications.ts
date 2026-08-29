import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'
import { logAdminAction } from '../../lib/auditLog.js'

const router = Router()

const applicationWithUserSelect = {
  id: true,
  fullName: true,
  mobile: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  panNumber: true,
  bankAccountNumber: true,
  bankIFSC: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true } },
}

router.get('/pending', authenticate('admin'), async (_req, res) => {
  const applications = await prisma.sellerApplication.findMany({
    where: { status: 'pending' },
    select: applicationWithUserSelect,
    orderBy: { createdAt: 'asc' },
  })

  res.json(applications)
})

router.patch<{ id: string }>('/:id/approve', authenticate('admin'), async (req, res) => {
  const application = await prisma.sellerApplication.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { role: true } } },
  })

  if (!application) {
    res.status(404).json({ error: 'application not found' })
    return
  }
  if (application.status !== 'pending') {
    res.status(409).json({ error: `application is not pending (current status: ${application.status})` })
    return
  }

  const [updated] = await prisma.$transaction([
    prisma.sellerApplication.update({
      where: { id: application.id },
      data: { status: 'approved' },
      select: applicationWithUserSelect,
    }),
    prisma.user.update({
      where: { id: application.userId },
      // Only promote a buyer to seller — an existing seller or admin who
      // applies to sell keeps their current role. Overwriting it
      // unconditionally would silently demote an admin to a seller.
      data:
        application.user.role === 'buyer'
          ? { sellerStatus: 'approved', role: 'seller' }
          : { sellerStatus: 'approved' },
    }),
  ])

  await logAdminAction(req.user!.id, 'approve_seller_application', updated.user.name)

  res.json(updated)
})

router.patch<{ id: string }>('/:id/reject', authenticate('admin'), async (req, res) => {
  const { reason } = req.body ?? {}

  if (typeof reason !== 'string' || !reason.trim()) {
    res.status(400).json({ error: 'reason is required' })
    return
  }

  const application = await prisma.sellerApplication.findUnique({ where: { id: req.params.id } })

  if (!application) {
    res.status(404).json({ error: 'application not found' })
    return
  }
  if (application.status !== 'pending') {
    res.status(409).json({ error: `application is not pending (current status: ${application.status})` })
    return
  }

  const [updated] = await prisma.$transaction([
    prisma.sellerApplication.update({
      where: { id: application.id },
      data: { status: 'rejected', rejectionReason: reason },
      select: applicationWithUserSelect,
    }),
    prisma.user.update({
      where: { id: application.userId },
      data: { sellerStatus: 'rejected' },
    }),
  ])

  await logAdminAction(req.user!.id, 'reject_seller_application', `${updated.user.name} — reason: ${reason}`)

  res.json(updated)
})

export default router

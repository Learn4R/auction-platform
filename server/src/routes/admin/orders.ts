import { ShippingStatus } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

export const orderSelect = {
  id: true,
  winningBid: true,
  buyerPremium: true,
  totalAmount: true,
  paymentStatus: true,
  shippingStatus: true,
  createdAt: true,
  buyer: { select: { id: true, name: true } },
  auction: {
    select: {
      id: true,
      item: { select: { id: true, title: true } },
    },
  },
}

router.get('/', authenticate('admin'), async (_req, res) => {
  const orders = await prisma.order.findMany({
    select: orderSelect,
    orderBy: { createdAt: 'desc' },
  })

  res.json(orders)
})

router.patch<{ id: string }>('/:id/shipping-status', authenticate('admin'), async (req, res) => {
  const { status } = req.body ?? {}

  if (typeof status !== 'string' || !Object.values(ShippingStatus).includes(status as ShippingStatus)) {
    res.status(400).json({ error: `status must be one of: ${Object.values(ShippingStatus).join(', ')}` })
    return
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order) {
    res.status(404).json({ error: 'order not found' })
    return
  }
  if (order.paymentStatus !== 'paid') {
    res.status(409).json({ error: 'order must be paid before its shipping status can be updated' })
    return
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { shippingStatus: status as ShippingStatus },
    select: orderSelect,
  })

  res.json(updated)
})

export default router

import { prisma } from './prisma.js'
import { getSellerCommissionPercent } from './settings.js'

/**
 * The single paid-transition used by both the buyer-facing verify-payment
 * route and the Razorpay webhook: marks an order paid and creates its
 * seller payout. Safe to call more than once for the same order — the
 * conditional updateMany only succeeds (and only then creates a payout)
 * the first time, so a retried webhook or a webhook racing the browser's
 * own verify-payment call can never create a duplicate payout.
 */
export async function markOrderPaid(orderId: string, razorpayPaymentId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { auction: { include: { item: { select: { sellerId: true } } } } },
  })
  if (!order) return { found: false as const, changed: false as const }

  let changed = false

  await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: order.id, paymentStatus: { not: 'paid' } },
      data: { paymentStatus: 'paid', razorpayPaymentId },
    })
    if (result.count === 0) return

    changed = true

    const commissionPercent = await getSellerCommissionPercent(tx)
    const gross = Number(order.winningBid)
    const commissionAmount = Math.round(gross * (commissionPercent / 100) * 100) / 100
    const netAmount = gross - commissionAmount

    await tx.payout.create({
      data: {
        sellerId: order.auction.item.sellerId,
        orderId: order.id,
        grossAmount: gross,
        commissionAmount,
        netAmount,
      },
    })
  })

  return { found: true as const, changed }
}

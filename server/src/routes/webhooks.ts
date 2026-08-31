import crypto from 'node:crypto'
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { markOrderPaid } from '../lib/orderPayment.js'

const router = Router()

interface RazorpayWebhookPayload {
  event?: string
  payload?: {
    payment?: {
      entity?: {
        id?: string
        order_id?: string
      }
    }
  }
}

// Razorpay calls this endpoint directly, server-to-server — there is no
// logged-in user and no session for it to send, so this route intentionally
// has no `authenticate()` middleware. That's expected, not an oversight;
// trust is established purely by verifying the HMAC signature below.
router.post('/razorpay', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[razorpay webhook] RAZORPAY_WEBHOOK_SECRET is not set')
    res.status(500).json({ error: 'Webhook is not configured' })
    return
  }

  const signature = req.header('X-Razorpay-Signature')
  // Mounted with express.raw() ahead of the app-wide express.json(), so
  // req.body is the untouched request Buffer here — required because the
  // signature is an HMAC over the exact raw bytes Razorpay sent, not over
  // a re-serialized version of the parsed JSON (which can differ in key
  // order/whitespace and would make every signature fail verification).
  if (typeof signature !== 'string' || !Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: 'Missing signature or body' })
    return
  }

  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  const validSignature =
    expectedBuf.length === signatureBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf)

  if (!validSignature) {
    console.warn('[razorpay webhook] rejected — signature mismatch')
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  let payload: RazorpayWebhookPayload
  try {
    payload = JSON.parse(req.body.toString('utf8'))
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const event = payload.event ?? 'unknown'
  const paymentEntity = payload.payload?.payment?.entity
  const razorpayOrderId = paymentEntity?.order_id
  const razorpayPaymentId = paymentEntity?.id

  let order: { id: string } | null = null
  let changed = false

  if (event === 'payment.captured' && razorpayOrderId && razorpayPaymentId) {
    order = await prisma.order.findFirst({ where: { razorpayOrderId }, select: { id: true } })
    if (order) {
      const result = await markOrderPaid(order.id, razorpayPaymentId)
      changed = result.changed
    }
  }

  console.log(
    `[razorpay webhook] event=${event} razorpayOrderId=${razorpayOrderId ?? 'n/a'} orderId=${order ? order.id : razorpayOrderId ? 'not found' : 'n/a'} changed=${changed}`,
  )

  // Always 200 once the signature is valid — Razorpay retries on non-2xx,
  // and there's nothing to gain from retries for events we don't act on
  // (wrong event type, unknown order, etc.).
  res.status(200).json({ received: true })
})

export default router

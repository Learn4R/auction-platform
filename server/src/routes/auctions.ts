import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { BidError, placeBid, setMaxBid } from '../realtime/bidding.js'

const router = Router()

router.post<{ id: string }>('/:id/bids', authenticate(), async (req, res) => {
  const { amount } = req.body ?? {}
  const amountNum = Number(amount)

  try {
    const result = await placeBid(req.params.id, req.user!.id, amountNum)
    res.status(201).json(result)
  } catch (error) {
    if (error instanceof BidError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    throw error
  }
})

router.post<{ id: string }>('/:id/max-bid', authenticate(), async (req, res) => {
  const { amount } = req.body ?? {}
  const amountNum = Number(amount)

  try {
    const result = await setMaxBid(req.params.id, req.user!.id, amountNum)
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof BidError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    throw error
  }
})

export default router

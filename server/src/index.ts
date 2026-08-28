import { createServer } from 'node:http'
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import adminRouter from './routes/admin/index.js'
import archiveRouter from './routes/archive.js'
import auctionsRouter from './routes/auctions.js'
import authRouter from './routes/auth.js'
import categoriesRouter from './routes/categories.js'
import itemsRouter from './routes/items.js'
import ordersRouter from './routes/orders.js'
import sellerRouter from './routes/seller.js'
import { initSocket } from './realtime/io.js'
import { startAuctionScheduler } from './realtime/scheduler.js'
import { ensureItemImagesBucket } from './lib/supabaseStorage.js'

const app = express()
const port = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'Server is running' })
})

app.use('/api/auth', authRouter)
app.use('/api/items', itemsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/seller', sellerRouter)
app.use('/api/admin', adminRouter)
app.use('/api/auctions', auctionsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/archive', archiveRouter)

const httpServer = createServer(app)
initSocket(httpServer)
startAuctionScheduler()

ensureItemImagesBucket().catch((err) => {
  console.error('Failed to verify/create the item-images storage bucket:', err)
})

httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

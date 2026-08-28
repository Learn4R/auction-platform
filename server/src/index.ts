import { createServer } from 'node:http'
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import adminRouter from './routes/admin/index.js'
import archiveRouter from './routes/archive.js'
import auctionsRouter from './routes/auctions.js'
import authRouter from './routes/auth.js'
import bidsRouter from './routes/bids.js'
import categoriesRouter from './routes/categories.js'
import itemsRouter from './routes/items.js'
import notificationsRouter from './routes/notifications.js'
import ordersRouter from './routes/orders.js'
import sellerRouter from './routes/seller.js'
import sellersRouter from './routes/sellers.js'
import watchlistRouter from './routes/watchlist.js'
import { initSocket } from './realtime/io.js'
import { startAuctionScheduler } from './realtime/scheduler.js'
import { ensureItemImagesBucket } from './lib/supabaseStorage.js'

const app = express()
const port = process.env.PORT ?? 3000
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173'

// Trust the first hop (the platform's load balancer/reverse proxy) so
// req.ip reflects the real client IP rather than the proxy's — required for
// IP-based rate limiting to work correctly once deployed.
app.set('trust proxy', 1)

app.use(cors({ origin: clientUrl }))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'Server is running' })
})

app.use('/api/auth', authRouter)
app.use('/api/items', itemsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/seller', sellerRouter)
app.use('/api/sellers', sellersRouter)
app.use('/api/admin', adminRouter)
app.use('/api/auctions', auctionsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/archive', archiveRouter)
app.use('/api/watchlist', watchlistRouter)
app.use('/api/bids', bidsRouter)
app.use('/api/notifications', notificationsRouter)

const httpServer = createServer(app)
initSocket(httpServer, clientUrl)
startAuctionScheduler()

ensureItemImagesBucket().catch((err) => {
  console.error('Failed to verify/create the item-images storage bucket:', err)
})

httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

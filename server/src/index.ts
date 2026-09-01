import { createServer } from 'node:http'
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import adminRouter from './routes/admin/index.js'
import archiveRouter from './routes/archive.js'
import auctionsRouter from './routes/auctions.js'
import authRouter from './routes/auth.js'
import bidsRouter from './routes/bids.js'
import categoriesRouter from './routes/categories.js'
import dashboardRouter from './routes/dashboard.js'
import itemsRouter from './routes/items.js'
import legalRouter from './routes/legal.js'
import notificationsRouter from './routes/notifications.js'
import ordersRouter from './routes/orders.js'
import sellerRouter from './routes/seller.js'
import sellersRouter from './routes/sellers.js'
import watchlistRouter from './routes/watchlist.js'
import webhooksRouter from './routes/webhooks.js'
import { adminLimiter } from './middleware/rateLimit.js'
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

app.use(helmet())
app.use(cors({ origin: clientUrl }))

// Mounted before express.json() and given its own express.raw() body
// parser: the Razorpay webhook signature is an HMAC over the exact raw
// request bytes, so this path must never be touched by the JSON parser
// below — once that runs, the original bytes are gone.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'Server is running' })
})

app.use('/api/auth', authRouter)
app.use('/api/items', itemsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/seller', sellerRouter)
app.use('/api/sellers', sellersRouter)
app.use('/api/admin', adminLimiter, adminRouter)
app.use('/api/auctions', auctionsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/archive', archiveRouter)
app.use('/api/watchlist', watchlistRouter)
app.use('/api/bids', bidsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/legal', legalRouter)

// Not every thrown value is an Error instance — notably, the Razorpay SDK
// rejects with a plain object literal (`throw { statusCode, error }`), and
// `String(plainObject)` collapses that to the useless "[object Object]".
// JSON.stringify captures the real, enumerable content of a plain object
// (or a string/number/etc. thrown directly) in a readable form; the
// try/catch guards the one way that can itself fail (a circular reference),
// falling back to String() rather than letting the logger itself throw.
function describeThrown(err: unknown): string {
  if (err instanceof Error) return err.message
  try {
    const json = JSON.stringify(err)
    if (json !== undefined) return json
  } catch {
    // circular reference, BigInt, etc. — fall through to String()
  }
  return String(err)
}

// Catch-all error handler — must be registered last, and must take all four
// parameters (that arity is what tells Express to treat it as an error
// handler rather than another route middleware). Express 5 automatically
// forwards a rejected promise from any async route handler here, so this
// covers both thrown errors and rejected async handlers project-wide.
// Logs with enough context to actually debug from, and never echoes the
// raw error/stack back to the client.
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = describeThrown(err)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${message}`)
  if (err instanceof Error && err.stack) console.error(err.stack)

  if (res.headersSent) return
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
})

const httpServer = createServer(app)
initSocket(httpServer, clientUrl)
startAuctionScheduler()

ensureItemImagesBucket().catch((err) => {
  console.error('Failed to verify/create the item-images storage bucket:', err)
})

httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

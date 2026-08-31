import express, { type Express } from 'express'
import jwt from 'jsonwebtoken'
import type { Role } from '@prisma/client'
import { prisma } from '../src/lib/prisma.js'
import adminRouter from '../src/routes/admin/index.js'
import auctionsRouter from '../src/routes/auctions.js'
import ordersRouter from '../src/routes/orders.js'
import sellerRouter from '../src/routes/seller.js'
import webhooksRouter from '../src/routes/webhooks.js'

/**
 * The same route wiring as src/index.ts, minus the pieces that don't belong
 * in a test process: no httpServer.listen(), no startAuctionScheduler()
 * (tests control auction state directly and would otherwise race a real
 * 5-second poll loop), no Supabase storage bucket check. supertest doesn't
 * need a listening server — it drives the Express app directly.
 */
export function buildTestApp(): Express {
  const app = express()
  app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)
  app.use(express.json())
  app.use('/api/orders', ordersRouter)
  app.use('/api/auctions', auctionsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/seller', sellerRouter)
  return app
}

// All tables in the "test" schema (see .env.test / tests/README.md),
// truncated together so FK order never matters. Called before every test
// so each one starts from a genuinely empty database rather than relying on
// manual per-test cleanup.
const ALL_TABLES = [
  'User',
  'Category',
  'Item',
  'Auction',
  'Bid',
  'MaxBid',
  'Watchlist',
  'Order',
  'PlatformSettings',
  'AdminAction',
  'Notification',
  'Review',
  'SellerApplication',
  'Reminder',
  'LegalPage',
  'Payout',
  'PasswordResetToken',
]

// INCIDENT: an earlier version of this function truncated these tables with
// no schema qualification at all (`TRUNCATE TABLE "User", "Category", ...`).
// Prisma's own generated queries (prisma.user.create(), etc.) do respect
// the adapter's `schema` option below — but raw SQL sent through
// $executeRawUnsafe does not; Postgres resolved those bare, unqualified
// names against the connection's default search_path ("public"), and this
// function truncated the real production/dev database, repeatedly, once
// per test. This rewrite fixes that two ways:
//
// 1. Every table name in the TRUNCATE is explicitly schema-qualified
//    (`"test"."User"`, not `"User"`) so resolution can never depend on
//    search_path again, regardless of what the adapter or connection does.
// 2. A hard-fail check runs first, independent of (1), refusing to
//    truncate anything unless DATABASE_SCHEMA is explicitly set to
//    something other than "public"/empty.
//
// Note this check deliberately does NOT query Postgres's own
// current_schema()/search_path — verified empirically that the adapter's
// `schema` option only changes how PRISMA'S OWN generated queries are
// qualified, it does not issue `SET search_path` on the connection, so
// current_schema() reports "public" here regardless of this setting. It is
// not a usable signal for this check. DATABASE_SCHEMA (the env var that
// configures the adapter in the first place — see src/lib/prisma.ts) is
// the only value that actually reflects which schema this call intends to
// hit, so that's what both the qualification and the guard are keyed on.
export async function resetDatabase() {
  const schema = process.env.DATABASE_SCHEMA

  if (!schema || schema === 'public') {
    throw new Error(
      `resetDatabase() refused to run: DATABASE_SCHEMA is ${JSON.stringify(schema ?? null)}, not a non-public ` +
        'test schema. This check exists specifically to stop this function from ever truncating the real ' +
        'database again — see the INCIDENT comment above this function.',
    )
  }

  const quoted = ALL_TABLES.map((t) => `"${schema}"."${t}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
}

let userCounter = 0

export async function createUser(overrides: { role?: Role; sellerStatus?: 'none' | 'pending' | 'approved' | 'rejected'; name?: string } = {}) {
  userCounter += 1
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `Test User ${userCounter}`,
      email: `test-user-${userCounter}-${Date.now()}@example.com`,
      // Never exercised by these tests (no /api/auth routes mounted in the
      // test app — tokens are minted directly below), so any string works.
      password: 'unused-in-tests',
      role: overrides.role ?? 'buyer',
      sellerStatus: overrides.sellerStatus ?? 'none',
    },
  })
  return user
}

export function tokenFor(user: { id: string; role: Role; name: string }) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

export async function createCategory() {
  userCounter += 1
  return prisma.category.create({
    data: { name: `Test Category ${userCounter}`, slug: `test-category-${userCounter}-${Date.now()}` },
  })
}

/**
 * Creates an approved Item plus its live Auction directly via Prisma —
 * mirrors what an approved, scheduled listing looks like in production,
 * without going through the multipart submission + admin-approval flow
 * (irrelevant to what these tests are checking).
 */
export async function createLiveAuction(overrides: {
  sellerId: string
  categoryId: string
  startingBid?: number
  bidIncrement?: number
  endsInMs?: number
  startedMsAgo?: number
}) {
  const startingBid = overrides.startingBid ?? 1000
  const bidIncrement = overrides.bidIncrement ?? 100
  const now = Date.now()

  const item = await prisma.item.create({
    data: {
      title: `Test Lot ${userCounter}`,
      description: 'A test lot.',
      categoryId: overrides.categoryId,
      sellerId: overrides.sellerId,
      status: 'approved',
      images: [],
    },
  })

  const auction = await prisma.auction.create({
    data: {
      itemId: item.id,
      startingBid,
      bidIncrement,
      status: 'live',
      startTime: new Date(now - (overrides.startedMsAgo ?? 60_000)),
      endTime: new Date(now + (overrides.endsInMs ?? 3_600_000)),
    },
  })

  return { item, auction }
}

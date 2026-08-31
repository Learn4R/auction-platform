import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildTestApp, createUser, resetDatabase, tokenFor } from './helpers.js'

const app = buildTestApp()

beforeEach(async () => {
  await resetDatabase()
})

describe('admin-only route gating', () => {
  it('rejects a buyer token with 403', async () => {
    const buyer = await createUser({ role: 'buyer' })
    const res = await request(app).get('/api/admin/audit-log').set('Authorization', `Bearer ${tokenFor(buyer)}`)
    expect(res.status).toBe(403)
  })

  it('rejects no token with 401', async () => {
    const res = await request(app).get('/api/admin/audit-log')
    expect(res.status).toBe(401)
  })

  it('allows an admin token through', async () => {
    const admin = await createUser({ role: 'admin' })
    const res = await request(app).get('/api/admin/audit-log').set('Authorization', `Bearer ${tokenFor(admin)}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// POST /api/seller/items/:id/resubmit is gated by role AND sellerStatus:
// authenticate() only requires a logged-in user, then a separate
// requireApprovedSeller check rejects anyone whose sellerStatus isn't
// 'approved' — including a buyer, and including a seller-role account
// that's still pending approval.
describe('seller-only route gating (unapproved seller)', () => {
  it('rejects an unapproved seller (role=seller, sellerStatus=pending) with 403', async () => {
    const pendingSeller = await createUser({ role: 'seller', sellerStatus: 'pending' })
    const res = await request(app)
      .post('/api/seller/items/nonexistent-id/resubmit')
      .set('Authorization', `Bearer ${tokenFor(pendingSeller)}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/approved seller/i)
  })

  it('rejects a buyer with 403', async () => {
    const buyer = await createUser({ role: 'buyer' })
    const res = await request(app).post('/api/seller/items/nonexistent-id/resubmit').set('Authorization', `Bearer ${tokenFor(buyer)}`)
    expect(res.status).toBe(403)
  })

  it('rejects no token with 401', async () => {
    const res = await request(app).post('/api/seller/items/nonexistent-id/resubmit')
    expect(res.status).toBe(401)
  })

  it('lets an approved seller through the gate (fails later only because the item does not exist)', async () => {
    const approvedSeller = await createUser({ role: 'seller', sellerStatus: 'approved' })
    const res = await request(app)
      .post('/api/seller/items/nonexistent-id/resubmit')
      .set('Authorization', `Bearer ${tokenFor(approvedSeller)}`)
    // Past the approval gate — the 404 here comes from the route's own
    // "item not found" check, proving the gate let this request through.
    expect(res.status).toBe(404)
  })
})

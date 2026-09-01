// Base URL of the server API — same backend client/ talks to. Must be
// EXPO_PUBLIC_-prefixed to be readable at runtime; see .env.example for
// why "localhost" doesn't always mean what you'd expect on a simulator
// or physical device.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

interface RequestOptions {
  method?: string
  token?: string | null
  body?: unknown
}

// A single shared request function every API call goes through — one place
// to set headers, attach the bearer token, and turn a non-2xx response into
// a thrown Error with the server's own message, mirroring the pattern
// client/src/lib/api.ts already uses for the same backend.
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type Role = 'buyer' | 'seller' | 'admin'
export type RegisterableRole = 'buyer' | 'seller'

export function login(email: string, password: string) {
  return request<{ token: string }>('/api/auth/login', { method: 'POST', body: { email, password } })
}

export function register(data: { name: string; email: string; password: string; role: RegisterableRole }) {
  return request<{ id: string; name: string; email: string; role: RegisterableRole; createdAt: string }>(
    '/api/auth/register',
    { method: 'POST', body: data },
  )
}

// Mirrors server/src/routes/items.ts' itemSummarySelect / AuctionStatus, and
// client/src/lib/api.ts's equivalent types — same backend, same shape.
export type AuctionStatus = 'upcoming' | 'live' | 'ended'

export interface AuctionSummary {
  id: string
  startingBid: string
  currentBid: string | null
  bidIncrement: string
  startTime: string
  endTime: string
  status: AuctionStatus
  winner: { id: string; name: string } | null
  _count: { bids: number }
}

export interface Bid {
  id: string
  amount: string
  createdAt: string
  isProxy: boolean
  user: { id: string; name: string }
}

export interface AuctionDetail extends AuctionSummary {
  bids: Bid[]
}

export interface ItemSummary {
  id: string
  title: string
  description: string
  year: number | null
  material: string | null
  condition: string | null
  denomination: string | null
  mint: string | null
  rulerAuthority: string | null
  period: string | null
  weight: string | null
  diameter: string | null
  grade: string | null
  certificateNumber: string | null
  gradingCompany: string | null
  provenance: string | null
  images: string[]
  category: { id: string; name: string; slug: string }
  seller: { id: string; name: string; verified: boolean }
  auction: AuctionSummary | null
}

export interface ItemDetail extends Omit<ItemSummary, 'auction'> {
  auction: AuctionDetail | null
}

// GET /api/items only ever returns approved items and needs no auth — same
// public endpoint the web app's Home/Browse pages call. No filters yet;
// the Auctions tab is a plain full list for this phase.
export function getItems() {
  return request<ItemSummary[]>('/api/items')
}

export function getItem(id: string) {
  return request<ItemDetail>(`/api/items/${id}`)
}

export function placeBid(auctionId: string, amount: number, token: string) {
  return request<{ currentBid: number; endTime: string; leaderId: string | null }>(
    `/api/auctions/${auctionId}/bids`,
    { method: 'POST', token, body: { amount } },
  )
}

export function setMaxBid(auctionId: string, amount: number, token: string) {
  return request<{ amount: number; currentBid: number | null; leaderId: string | null }>(
    `/api/auctions/${auctionId}/max-bid`,
    { method: 'POST', token, body: { amount } },
  )
}

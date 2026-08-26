const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type AuctionStatus = 'upcoming' | 'live' | 'ended'
export type ItemStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type Role = 'buyer' | 'seller' | 'admin'

export interface Category {
  id: string
  name: string
  slug: string
  itemCount: number
}

export interface AuctionSummary {
  id: string
  startingBid: string
  currentBid: string | null
  bidIncrement: string
  startTime: string
  endTime: string
  status: AuctionStatus
  _count: { bids: number }
}

export interface Bid {
  id: string
  amount: string
  createdAt: string
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
  images: string[]
  status: ItemStatus
  category: { id: string; name: string; slug: string }
  seller: { id: string; name: string }
  auction: AuctionSummary | null
}

export interface ItemDetail extends Omit<ItemSummary, 'auction'> {
  auction: AuctionDetail | null
}

export interface ItemSubmission extends ItemSummary {
  proposedStartingBid: string | null
  proposedBidIncrement: string | null
  proposedStartTime: string | null
  proposedEndTime: string | null
  rejectionReason: string | null
}

interface RequestOptions {
  method?: string
  token?: string | null
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function getCategories() {
  return request<Category[]>('/api/categories')
}

export function getItems(filters: { status?: AuctionStatus; category?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.category) params.set('category', filters.category)
  const query = params.toString()
  return request<ItemSummary[]>(`/api/items${query ? `?${query}` : ''}`)
}

export function getItem(id: string) {
  return request<ItemDetail>(`/api/items/${id}`)
}

export function login(email: string, password: string) {
  return request<{ token: string }>('/api/auth/login', { method: 'POST', body: { email, password } })
}

export interface ItemSubmissionInput {
  title: string
  description: string
  categoryId: string
  year: number | null
  material: string
  condition: string
  images: string[]
  startingBid: number
  bidIncrement: number
  startTime: string
  endTime: string
}

export function submitItem(data: ItemSubmissionInput, token: string) {
  return request<ItemSubmission>('/api/items', { method: 'POST', body: data, token })
}

export function getMyItems(token: string) {
  return request<ItemSubmission[]>('/api/seller/items', { token })
}

export function getPendingItems(token: string) {
  return request<ItemSubmission[]>('/api/admin/items/pending', { token })
}

export function approveItem(id: string, token: string) {
  return request<ItemSubmission>(`/api/admin/items/${id}/approve`, { method: 'PATCH', token })
}

export function rejectItem(id: string, reason: string, token: string) {
  return request<ItemSubmission>(`/api/admin/items/${id}/reject`, {
    method: 'PATCH',
    token,
    body: { reason },
  })
}

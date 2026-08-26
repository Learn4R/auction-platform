const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type AuctionStatus = 'upcoming' | 'live' | 'ended'

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
  status: string
  category: { id: string; name: string; slug: string }
  seller: { id: string; name: string }
  auction: AuctionSummary | null
}

export interface ItemDetail extends Omit<ItemSummary, 'auction'> {
  auction: AuctionDetail | null
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
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

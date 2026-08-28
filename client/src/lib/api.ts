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
  const isFormData = options.body instanceof FormData
  // Let the browser set the multipart Content-Type (with boundary) itself.
  if (options.body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : isFormData ? (options.body as FormData) : JSON.stringify(options.body),
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

export type RegisterableRole = 'buyer' | 'seller'

export function register(data: { name: string; email: string; password: string; role: RegisterableRole }) {
  return request<{ id: string; name: string; email: string; role: RegisterableRole; createdAt: string }>(
    '/api/auth/register',
    { method: 'POST', body: data },
  )
}

export interface ItemSubmissionInput {
  title: string
  description: string
  categoryId: string
  year: number | null
  material: string
  condition: string
  images: File[]
  startingBid: number
  bidIncrement: number
  startTime: string
  endTime: string
}

export function submitItem(data: ItemSubmissionInput, token: string) {
  const form = new FormData()
  form.set('title', data.title)
  form.set('description', data.description)
  form.set('categoryId', data.categoryId)
  if (data.year !== null) form.set('year', String(data.year))
  form.set('material', data.material)
  form.set('condition', data.condition)
  form.set('startingBid', String(data.startingBid))
  form.set('bidIncrement', String(data.bidIncrement))
  form.set('startTime', data.startTime)
  form.set('endTime', data.endTime)
  for (const file of data.images) form.append('images', file)

  return request<ItemSubmission>('/api/items', { method: 'POST', body: form, token })
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

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type ShippingStatus = 'processing' | 'shipped' | 'inTransit' | 'delivered'

export interface Order {
  id: string
  winningBid: string
  buyerPremium: string
  totalAmount: string
  paymentStatus: PaymentStatus
  shippingStatus: ShippingStatus
  razorpayOrderId: string | null
  createdAt: string
  auction: { id: string; endTime: string; item: { id: string; title: string; category: { name: string } } }
}

export interface AdminOrder extends Order {
  buyer: { id: string; name: string }
}

export function getOrders(token: string) {
  return request<Order[]>('/api/orders', { token })
}

export function createPayment(orderId: string, token: string) {
  return request<{ razorpayOrderId: string; amount: number; currency: string; keyId: string }>(
    `/api/orders/${orderId}/create-payment`,
    { method: 'POST', token },
  )
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export function verifyPayment(orderId: string, payload: RazorpayVerifyPayload, token: string) {
  return request<Order>(`/api/orders/${orderId}/verify-payment`, { method: 'POST', token, body: payload })
}

export function getAdminOrders(token: string) {
  return request<AdminOrder[]>('/api/admin/orders', { token })
}

export function updateShippingStatus(orderId: string, status: ShippingStatus, token: string) {
  return request<AdminOrder>(`/api/admin/orders/${orderId}/shipping-status`, {
    method: 'PATCH',
    token,
    body: { status },
  })
}

export interface AdminStats {
  totalUsers: number
  totalSellers: number
  verifiedSellers: number
  liveAuctions: number
  upcomingAuctions: number
  completedAuctions: number
  totalSalesValue: string
  platformRevenue: string
  pendingSellerApprovals: number
  pendingPayments: number
}

export function getAdminStats(token: string) {
  return request<AdminStats>('/api/admin/stats', { token })
}

export function getSettings(token: string) {
  return request<{ buyerPremiumPercent: string }>('/api/admin/settings', { token })
}

export function updateSettings(buyerPremiumPercent: number, token: string) {
  return request<{ buyerPremiumPercent: string }>('/api/admin/settings', {
    method: 'PATCH',
    token,
    body: { buyerPremiumPercent },
  })
}

export interface AdminCategory {
  id: string
  name: string
  slug: string
  itemCount: number
}

export function getAdminCategories(token: string) {
  return request<AdminCategory[]>('/api/admin/categories', { token })
}

export function createCategory(data: { name: string; slug?: string }, token: string) {
  return request<AdminCategory>('/api/admin/categories', { method: 'POST', token, body: data })
}

export function updateCategory(id: string, data: { name?: string; slug?: string }, token: string) {
  return request<AdminCategory>(`/api/admin/categories/${id}`, { method: 'PATCH', token, body: data })
}

export function deleteCategory(id: string, token: string) {
  return request<void>(`/api/admin/categories/${id}`, { method: 'DELETE', token })
}

export interface AdminSeller {
  id: string
  name: string
  email: string
  verified: boolean
  createdAt: string
  itemCount: number
}

export function getAdminSellers(token: string) {
  return request<AdminSeller[]>('/api/admin/sellers', { token })
}

export function toggleSellerVerification(id: string, token: string) {
  return request<AdminSeller>(`/api/admin/sellers/${id}/verify`, { method: 'PATCH', token })
}

export type ArchiveSort = 'recent' | 'priceHigh' | 'priceLow'

export interface ArchiveEntry {
  id: string
  title: string
  description: string
  year: number | null
  material: string | null
  condition: string | null
  images: string[]
  category: { id: string; name: string; slug: string }
  seller: { id: string; name: string }
  hammerPrice: string
  bidsCount: number
  endedAt: string
}

export interface ArchiveFilters {
  category?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  dateFrom?: string
  dateTo?: string
  sort?: ArchiveSort
}

export function getArchive(filters: ArchiveFilters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.search) params.set('search', filters.search)
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice))
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.sort) params.set('sort', filters.sort)
  const query = params.toString()
  return request<ArchiveEntry[]>(`/api/archive${query ? `?${query}` : ''}`)
}

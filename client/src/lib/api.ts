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
  denomination: string
  mint: string
  rulerAuthority: string
  period: string
  weight: string
  diameter: string
  grade: string
  certificateNumber: string
  gradingCompany: string
  provenance: string
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
  form.set('denomination', data.denomination)
  form.set('mint', data.mint)
  form.set('rulerAuthority', data.rulerAuthority)
  form.set('period', data.period)
  form.set('weight', data.weight)
  form.set('diameter', data.diameter)
  form.set('grade', data.grade)
  form.set('certificateNumber', data.certificateNumber)
  form.set('gradingCompany', data.gradingCompany)
  form.set('provenance', data.provenance)
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

export interface OrderReview {
  id: string
  rating: number
  comment: string | null
  createdAt: string
}

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
  review: OrderReview | null
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

export function submitReview(orderId: string, data: { rating: number; comment?: string }, token: string) {
  return request<OrderReview>(`/api/orders/${orderId}/review`, { method: 'POST', token, body: data })
}

export interface SellerReview {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  reviewer: { id: string; name: string }
}

export interface SellerReviews {
  averageRating: number | null
  reviewCount: number
  reviews: SellerReview[]
}

export function getSellerReviews(sellerId: string) {
  return request<SellerReviews>(`/api/sellers/${sellerId}/reviews`)
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

export interface PlatformSettingsData {
  buyerPremiumPercent: string
  sellerCommissionPercent: string
}

export function getSettings(token: string) {
  return request<PlatformSettingsData>('/api/admin/settings', { token })
}

export function updateSettings(
  data: { buyerPremiumPercent?: number; sellerCommissionPercent?: number },
  token: string,
) {
  return request<PlatformSettingsData>('/api/admin/settings', {
    method: 'PATCH',
    token,
    body: data,
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

export function getWatchlist(token: string) {
  return request<ItemSummary[]>('/api/watchlist', { token })
}

export function toggleWatchlist(itemId: string, token: string) {
  return request<{ watchlisted: boolean }>(`/api/watchlist/${itemId}`, { method: 'POST', token })
}

export function getMyReminders(token: string) {
  return request<string[]>('/api/auctions/reminders/mine', { token })
}

export function toggleReminder(auctionId: string, token: string) {
  return request<{ reminding: boolean }>(`/api/auctions/${auctionId}/remind`, { method: 'POST', token })
}

export interface MyBidRow {
  auctionId: string
  item: { id: string; title: string; images: string[]; category: { id: string; name: string; slug: string } }
  currentBid: string | null
  status: AuctionStatus
  endTime: string
  myHighestBid: string
  isWinning: boolean
}

export function getMyBids(token: string) {
  return request<MyBidRow[]>('/api/bids/mine', { token })
}

export interface AuditLogEntry {
  id: string
  action: string
  target: string
  createdAt: string
  admin: { id: string; name: string }
}

export function getAuditLog(token: string) {
  return request<AuditLogEntry[]>('/api/admin/audit-log', { token })
}

export type NotificationType =
  | 'outbid'
  | 'auction_won'
  | 'listing_approved'
  | 'listing_rejected'
  | 'auction_extended'
  | 'auction_started'

export interface AppNotification {
  id: string
  type: NotificationType
  message: string
  read: boolean
  itemId: string | null
  auctionId: string | null
  createdAt: string
}

export function getNotifications(token: string) {
  return request<AppNotification[]>('/api/notifications', { token })
}

export function markNotificationRead(id: string, token: string) {
  return request<AppNotification>(`/api/notifications/${id}/read`, { method: 'PATCH', token })
}

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'on_hold'

export interface SellerPayout {
  id: string
  grossAmount: string
  commissionAmount: string
  netAmount: string
  status: PayoutStatus
  createdAt: string
  updatedAt: string
  order: { id: string; auction: { item: { id: string; title: string } } }
}

export function getSellerPayouts(token: string) {
  return request<SellerPayout[]>('/api/seller/payouts', { token })
}

export interface AdminPayout extends SellerPayout {
  seller: { id: string; name: string; email: string }
  order: SellerPayout['order'] & { buyer: { id: string; name: string } }
}

export function getAdminPayouts(token: string) {
  return request<AdminPayout[]>('/api/admin/payouts', { token })
}

export function updatePayoutStatus(id: string, status: PayoutStatus, token: string) {
  return request<AdminPayout>(`/api/admin/payouts/${id}/status`, { method: 'PATCH', token, body: { status } })
}

export const LEGAL_PAGES: { slug: string; label: string }[] = [
  { slug: 'terms-and-conditions', label: 'Terms & Conditions' },
  { slug: 'privacy-policy', label: 'Privacy Policy' },
  { slug: 'auction-terms', label: 'Auction Terms' },
  { slug: 'shipping-policy', label: 'Shipping Policy' },
  { slug: 'authenticity-disclaimer', label: 'Authenticity Disclaimer' },
]

export interface LegalPage {
  slug: string
  title: string
  content: string
  updatedAt: string
}

export function getLegalPage(slug: string) {
  return request<LegalPage>(`/api/legal/${slug}`)
}

export function updateLegalPage(slug: string, data: { title?: string; content?: string }, token: string) {
  return request<LegalPage>(`/api/admin/legal/${slug}`, { method: 'PATCH', token, body: data })
}

export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type SellerApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface SellerApplication {
  id: string
  fullName: string
  mobile: string
  address: string
  city: string
  state: string
  pincode: string
  panNumber: string
  bankAccountNumber: string
  bankIFSC: string
  status: SellerApplicationStatus
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

export interface SellerApplicationInput {
  fullName: string
  mobile: string
  address: string
  city: string
  state: string
  pincode: string
  panNumber: string
  bankAccountNumber: string
  bankIFSC: string
}

export interface MySellerApplication {
  sellerStatus: SellerStatus
  application: SellerApplication | null
}

export function getMySellerApplication(token: string) {
  return request<MySellerApplication>('/api/seller/application', { token })
}

export function applyToSell(data: SellerApplicationInput, token: string) {
  return request<SellerApplication>('/api/seller/apply', { method: 'POST', token, body: data })
}

export interface SellerDashboardSummary {
  sellerStatus: SellerStatus
  application: SellerApplication | null
  activeAuctions: number
  soldItems: number
  unsoldItems: number
  earnings: number
  pendingPayout: number
}

export function getSellerDashboardSummary(token: string) {
  return request<SellerDashboardSummary>('/api/seller/dashboard-summary', { token })
}

export interface AdminSellerApplication extends SellerApplication {
  user: { id: string; name: string; email: string }
}

export function getPendingSellerApplications(token: string) {
  return request<AdminSellerApplication[]>('/api/admin/seller-applications/pending', { token })
}

export function approveSellerApplication(id: string, token: string) {
  return request<AdminSellerApplication>(`/api/admin/seller-applications/${id}/approve`, { method: 'PATCH', token })
}

export function rejectSellerApplication(id: string, reason: string, token: string) {
  return request<AdminSellerApplication>(`/api/admin/seller-applications/${id}/reject`, {
    method: 'PATCH',
    token,
    body: { reason },
  })
}

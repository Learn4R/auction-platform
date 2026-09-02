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
  const isFormData = options.body instanceof FormData
  // Let RN's fetch set the multipart Content-Type (with boundary) itself.
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

export function getWatchlist(token: string) {
  return request<ItemSummary[]>('/api/watchlist', { token })
}

export function toggleWatchlist(itemId: string, token: string) {
  return request<{ watchlisted: boolean }>(`/api/watchlist/${itemId}`, { method: 'POST', token })
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

export interface PaginatedNotifications {
  notifications: AppNotification[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function getAllNotifications(page: number, token: string) {
  return request<PaginatedNotifications>(`/api/notifications/all?page=${page}`, { token })
}

export interface Category {
  id: string
  name: string
  slug: string
  itemCount: number
}

export function getCategories() {
  return request<Category[]>('/api/categories')
}

export interface MyProfile {
  id: string
  name: string
  email: string
  role: Role
}

export function getMyProfile(token: string) {
  return request<MyProfile>('/api/auth/me', { token })
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

export type ItemStatus = 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'rejected'

// The seller's own view of a listing they've submitted — every text field is
// nullable because a draft can be saved before any of them are filled in.
// Mirrors client/src/lib/api.ts's ItemSubmission exactly.
export interface ItemSubmission {
  id: string
  title: string | null
  description: string | null
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
  displayStatus: string | null
  category: { id: string; name: string; slug: string } | null
  proposedStartingBid: string | null
  proposedBidIncrement: string | null
  proposedStartTime: string | null
  proposedEndTime: string | null
  rejectionReason: string | null
  changesRequestedNote: string | null
}

export function getMyItems(token: string) {
  return request<ItemSubmission[]>('/api/seller/items', { token })
}

// React Native's fetch/FormData expects a plain {uri, name, type} object for
// a file part on native — not a browser File/Blob, which is what
// client/src/lib/api.ts appends on web. expo-image-picker's own web
// implementation hands back a real File on its ImagePickerAsset.file for
// exactly this reason, so webFile just carries that through when present;
// submitItem below picks whichever one the current platform needs.
export interface ItemImagePick {
  uri: string
  name: string
  type: string
  webFile?: File
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
  images: ItemImagePick[]
  startingBid: number
  bidIncrement: number
  startTime: string
  endTime: string
}

export function submitItem(data: ItemSubmissionInput, token: string) {
  const form = new FormData()
  form.append('title', data.title)
  form.append('description', data.description)
  form.append('categoryId', data.categoryId)
  if (data.year !== null) form.append('year', String(data.year))
  form.append('material', data.material)
  form.append('condition', data.condition)
  form.append('denomination', data.denomination)
  form.append('mint', data.mint)
  form.append('rulerAuthority', data.rulerAuthority)
  form.append('period', data.period)
  form.append('weight', data.weight)
  form.append('diameter', data.diameter)
  form.append('grade', data.grade)
  form.append('certificateNumber', data.certificateNumber)
  form.append('gradingCompany', data.gradingCompany)
  form.append('provenance', data.provenance)
  form.append('startingBid', String(data.startingBid))
  form.append('bidIncrement', String(data.bidIncrement))
  form.append('startTime', data.startTime)
  form.append('endTime', data.endTime)
  for (const img of data.images) {
    if (img.webFile) {
      form.append('images', img.webFile, img.name)
    } else {
      // @ts-expect-error React Native's FormData accepts a {uri, name, type}
      // object for file parts on native; the DOM lib's FormData types don't
      // know that shape.
      form.append('images', { uri: img.uri, name: img.name, type: img.type })
    }
  }
  return request<ItemSubmission>('/api/items', { method: 'POST', token, body: form })
}

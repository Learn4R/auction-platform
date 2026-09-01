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

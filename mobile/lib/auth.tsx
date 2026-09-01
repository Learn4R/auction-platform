import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import { login as apiLogin, register as apiRegister, type RegisterableRole, type Role } from './api'
import { secureStorage } from './secureStorage'

export interface AuthUser {
  id: string
  role: Role
  name: string
  exp: number
}

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  // True only while the stored session is being read on cold start — lets
  // the root layout hold off rendering Login/Home until it actually knows
  // which one is correct, instead of flashing the wrong screen first.
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { name: string; email: string; password: string; role: RegisterableRole }) => Promise<void>
  logout: () => Promise<void>
}

// Goes through lib/secureStorage.ts, which is expo-secure-store (the OS
// keychain/keystore) on iOS and Android — this is a real auth token, not
// something to leave in plain unencrypted storage. See that file for why
// web is a documented exception.
const STORAGE_KEY = 'mudra_token'

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<{ id: string; role: Role; name: string; exp: number }>(token)
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null
    return { id: payload.id, role: payload.role, name: payload.name, exp: payload.exp }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await secureStorage.getItem(STORAGE_KEY)
        if (!stored) return
        const decoded = decodeToken(stored)
        if (decoded) {
          if (!cancelled) {
            setToken(stored)
            setUser(decoded)
          }
        } else {
          // Expired or malformed — don't keep serving a dead token.
          await secureStorage.removeItem(STORAGE_KEY)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function login(email: string, password: string) {
    const { token: newToken } = await apiLogin(email, password)
    const decoded = decodeToken(newToken)
    if (!decoded) throw new Error('Received an invalid token')
    await secureStorage.setItem(STORAGE_KEY, newToken)
    setToken(newToken)
    setUser(decoded)
  }

  async function register(data: { name: string; email: string; password: string; role: RegisterableRole }) {
    await apiRegister(data)
    // Registering doesn't itself return a session — log straight in with
    // the same credentials, same as the web client does.
    await login(data.email, data.password)
  }

  async function logout() {
    await secureStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

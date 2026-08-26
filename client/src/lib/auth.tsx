import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { login as apiLogin, type Role } from './api'

export interface AuthUser {
  id: string
  role: Role
  exp: number
}

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const STORAGE_KEY = 'mudra_token'

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null
    return { id: payload.id, role: payload.role, exp: payload.exp }
  } catch {
    return null
  }
}

function loadStoredSession(): { token: string | null; user: AuthUser | null } {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return { token: null, user: null }

  const decoded = decodeToken(stored)
  if (!decoded) {
    localStorage.removeItem(STORAGE_KEY)
    return { token: null, user: null }
  }
  return { token: stored, user: decoded }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ token, user }, setSession] = useState(loadStoredSession)

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      login: async (email, password) => {
        const { token: newToken } = await apiLogin(email, password)
        const decoded = decodeToken(newToken)
        if (!decoded) throw new Error('Received an invalid token')
        localStorage.setItem(STORAGE_KEY, newToken)
        setSession({ token: newToken, user: decoded })
        return decoded
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY)
        setSession({ token: null, user: null })
      },
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

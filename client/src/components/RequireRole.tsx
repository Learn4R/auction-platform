import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/api'

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/" replace />

  return <>{children}</>
}

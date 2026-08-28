import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/api'

export function RequireRole({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { user } = useAuth()
  const allowedRoles = Array.isArray(role) ? role : [role]

  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />

  return <>{children}</>
}

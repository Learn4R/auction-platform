import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Role } from '@prisma/client'

export interface AuthPayload {
  id: string
  role: Role
  name: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function authenticate(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

    if (!token) {
      res.status(401).json({ error: 'Missing authentication token' })
      return
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      res.status(500).json({ error: 'Server auth configuration is missing' })
      return
    }

    let payload: AuthPayload
    try {
      payload = jwt.verify(token, secret) as AuthPayload
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    req.user = payload
    next()
  }
}

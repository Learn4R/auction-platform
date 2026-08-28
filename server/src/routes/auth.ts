import bcrypt from 'bcrypt'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { Role } from '@prisma/client'

const router = Router()
const SALT_ROUNDS = 10
// Admin accounts are provisioned directly in the database, never through
// public self-registration.
const REGISTERABLE_ROLES: Role[] = ['buyer', 'seller']

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body ?? {}

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  if (typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ error: 'email is required' })
    return
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'password must be at least 8 characters' })
    return
  }
  if (!REGISTERABLE_ROLES.includes(role)) {
    res.status(400).json({ error: `role must be one of: ${REGISTERABLE_ROLES.join(', ')}` })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'email is already registered' })
    return
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: { name, email, password: passwordHash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  res.status(201).json(user)
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'invalid email or password' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'invalid email or password' })
    return
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ error: 'Server auth configuration is missing' })
    return
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, secret, { expiresIn: '1d' })

  res.json({ token })
})

router.get('/me', authenticate(), (req, res) => {
  res.json({ user: req.user })
})

export default router

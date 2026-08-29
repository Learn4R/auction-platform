import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'
import { Role } from '@prisma/client'

const router = Router()
const SALT_ROUNDS = 10
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
// Admin accounts are provisioned directly in the database, never through
// public self-registration.
const REGISTERABLE_ROLES: Role[] = ['buyer', 'seller']

router.post('/register', authLimiter, async (req, res) => {
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

router.post('/login', authLimiter, async (req, res) => {
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

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body ?? {}

  if (typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ error: 'email is required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Same generic response whether or not the email matched an account —
  // confirming or denying an account's existence here is itself a privacy
  // leak, so only do the actual work silently when there's a real match.
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    })

    // TEMPORARY STAND-IN, NOT PRODUCTION-SAFE: this app has no email-sending
    // system yet, so instead of emailing the reset link, we return it
    // directly in the API response so the reset flow itself is built and
    // testable today. A real deployment must email this link to the
    // account's inbox and MUST NOT return it in the response — returning it
    // here means anyone who can submit this endpoint for a known email
    // address can reset that account's password themselves. Replace this
    // with actual email delivery before this ever runs against real users.
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173'
    const resetLink = `${clientUrl}/reset-password?token=${token}`
    res.json({ message: 'If that email is registered, a reset link has been generated.', resetLink })
    return
  }

  res.json({ message: 'If that email is registered, a reset link has been generated.' })
})

router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body ?? {}

  if (typeof token !== 'string' || !token.trim()) {
    res.status(400).json({ error: 'token is required' })
    return
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'password must be at least 8 characters' })
    return
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' })
    return
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { password: passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
  ])

  res.json({ message: 'Your password has been reset. You can now log in with your new password.' })
})

router.get('/me', authenticate(), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      defaultShippingName: true,
      defaultShippingPhone: true,
      defaultShippingAddressLine1: true,
      defaultShippingAddressLine2: true,
      defaultShippingCity: true,
      defaultShippingState: true,
      defaultShippingPincode: true,
    },
  })

  if (!user) {
    res.status(404).json({ error: 'user not found' })
    return
  }

  res.json(user)
})

export default router

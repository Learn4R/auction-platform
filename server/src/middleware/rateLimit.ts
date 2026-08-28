import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this IP. Please try again in 15 minutes.' },
})

// Keyed per authenticated user (falling back to IP if somehow unauthenticated)
// rather than per IP, so one spammy user can't hide behind a shared IP and a
// shared IP full of legitimate bidders isn't punished for one bad actor.
export const bidLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { error: "You're placing bids too quickly. Please slow down and try again shortly." },
})

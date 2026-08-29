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

// Item creation and image upload — generous enough for a seller working
// through several listings/edits in one session, tight enough to block a
// scripted flood of submissions or uploads.
export const itemLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { error: 'Too many listing/upload requests. Please slow down and try again shortly.' },
})

// Reviews are inherently infrequent (at most one per completed order), so
// this is mainly a floor against scripted review spam.
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { error: 'Too many reviews submitted. Please try again later.' },
})

// Watchlist toggling is a normal, rapid browsing action (heart icon on many
// cards), so this stays loose — it's a backstop against scripted abuse, not
// a limit a real user would ever bump into.
export const watchlistLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { error: "You're updating your watchlist too quickly. Please slow down." },
})

// Every /api/admin/* route shares this one limiter, applied once at the
// mount point — ahead of each route's own authenticate('admin') check, so
// this keys by IP (the default) rather than user id. Staff legitimately
// make many requests in a session (loading several queues, working through
// approvals), so this is deliberately generous — it exists to catch a
// runaway script or compromised session, not to throttle normal admin work.
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests from this network. Please slow down.' },
})

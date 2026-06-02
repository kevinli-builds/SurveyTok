import rateLimit from 'express-rate-limit'

// Brute-force protection for surveyor login: limit FAILED attempts per handle,
// independent of source IP (all surveyor traffic arrives via the Vercel proxy,
// so it shares one IP — keying by handle is what actually stops credential guessing).
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed logins (>=400) count
  keyGenerator: (req) => `login:${String(req.body?.handle || '').trim().toLowerCase()}`,
  message: { error: 'Too many attempts for this account. Please try again later.' },
})

// Cap account-creation volume (keyed by the proxy IP — a global backstop).
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-ups right now. Please try again later.' },
})

// Spam guard for public write endpoints (votes, new questions). These are called
// directly by clients, so with `trust proxy` set the key is the real client IP.
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down — too many requests.' },
})

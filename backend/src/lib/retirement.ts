import type { RequestHandler } from 'express'

// SurveyTok is parked. If this instance stays deployed but unmaintained, it's a
// standing attack surface (auth + a respondent DB). Setting SERVICE_RETIRED=1 (or
// "true") closes that surface WITHOUT deleting the service: every route except the
// allowlist answers 503. Off by default — no behaviour change unless the env var is
// set. See OPUS_BRIEF ST1 (the cleaner option is still to suspend the Render service
// + Neon DB entirely; this is the "keep it up but inert" middle ground).
export const SERVICE_RETIRED =
  process.env.SERVICE_RETIRED === '1' || process.env.SERVICE_RETIRED === 'true'

// Paths that stay reachable when retired: a liveness probe and the privacy page
// (which may still be linked from app-store listings / policies).
const ALLOW_WHEN_RETIRED = new Set(['/health', '/privacy'])

/** Middleware factory: when `retired`, 503 everything outside the allowlist. */
export function retirementGuard(retired: boolean): RequestHandler {
  return (req, res, next) => {
    if (!retired || ALLOW_WHEN_RETIRED.has(req.path)) return next()
    res.status(503).json({ error: 'SurveyTok has been retired and is no longer accepting requests.' })
  }
}

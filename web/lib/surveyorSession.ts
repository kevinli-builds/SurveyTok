import { createHmac, timingSafeEqual } from 'crypto'

// The surveyor session is a signed cookie set server-side after credentials are
// verified. It carries the surveyor id + handle, HMAC-signed with ADMIN_SECRET
// so a client cannot forge or tamper with it. Format: "<base64url payload>.<sig>".

const SECRET = process.env.ADMIN_SECRET || 'insecure-dev-secret'

export type SurveyorSession = { id: string; handle: string }

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function createSessionToken(session: SurveyorSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readSessionToken(token: string | undefined | null): SurveyorSession | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (parsed && typeof parsed.id === 'string' && typeof parsed.handle === 'string') {
      return { id: parsed.id, handle: parsed.handle }
    }
    return null
  } catch {
    return null
  }
}

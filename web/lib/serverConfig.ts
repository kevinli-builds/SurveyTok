// Server-only configuration shared by the surveyor proxy routes.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Secret the web server presents to the backend's surveyor (server-to-server)
// endpoints. Falls back to ADMIN_SECRET so nothing breaks until a dedicated
// INTERNAL_API_SECRET is configured on BOTH Render and Vercel.
export const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.ADMIN_SECRET || ''

export const internalHeaders = { 'x-admin-secret': INTERNAL_SECRET }

// Mark cookies Secure in production (HTTPS) but not in local dev (HTTP).
export const cookieSecure = process.env.NODE_ENV === 'production'

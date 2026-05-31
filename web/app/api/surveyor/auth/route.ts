import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSessionToken } from '@/lib/surveyorSession'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const COOKIE = 'surveyor_session'

export async function POST(req: NextRequest) {
  const { mode, handle, password } = await req.json()
  if (!handle || !password) {
    return NextResponse.json({ error: 'Handle and passphrase required' }, { status: 400 })
  }

  const endpoint = mode === 'register' ? 'register' : 'login'
  const res = await fetch(`${API_URL}/surveyors/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': process.env.ADMIN_SECRET ?? '',
    },
    body: JSON.stringify({ handle, password }),
  })
  const data = await res.json()
  if (!res.ok) return NextResponse.json(data, { status: res.status })

  const token = createSessionToken({ id: data.id, handle: data.handle })
  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return NextResponse.json({ handle: data.handle })
}

export async function DELETE() {
  const store = await cookies()
  store.delete(COOKIE)
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionToken } from '@/lib/surveyorSession'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const secretHeader = { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' }

async function getSession() {
  const store = await cookies()
  return readSessionToken(store.get('surveyor_session')?.value)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${API_URL}/surveyors/${session.id}/questions`, {
    headers: secretHeader,
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${API_URL}/surveyors/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...secretHeader },
    body: JSON.stringify({ ...body, surveyorId: session.id }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

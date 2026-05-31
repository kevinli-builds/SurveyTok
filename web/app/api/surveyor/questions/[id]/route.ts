import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionToken } from '@/lib/surveyorSession'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const secretHeader = { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' }

async function getSession() {
  const store = await cookies()
  return readSessionToken(store.get('surveyor_session')?.value)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const res = await fetch(`${API_URL}/surveyors/${session.id}/questions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...secretHeader },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${API_URL}/surveyors/${session.id}/questions/${id}`, {
    method: 'DELETE',
    headers: secretHeader,
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionToken } from '@/lib/surveyorSession'
import { API_URL, internalHeaders } from '@/lib/serverConfig'

export async function GET() {
  const store = await cookies()
  const session = readSessionToken(store.get('surveyor_session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${API_URL}/surveyors/${session.id}/stats`, {
    headers: internalHeaders,
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

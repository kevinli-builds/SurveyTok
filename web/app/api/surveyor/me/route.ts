import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionToken } from '@/lib/surveyorSession'

export async function GET() {
  const store = await cookies()
  const session = readSessionToken(store.get('surveyor_session')?.value)
  if (!session) return NextResponse.json({ authed: false })
  return NextResponse.json({ authed: true, handle: session.handle })
}

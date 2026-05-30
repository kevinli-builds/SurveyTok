import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const store = await cookies()
  if (store.get('admin_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const res = await fetch(`${API_URL}/questions/admin/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

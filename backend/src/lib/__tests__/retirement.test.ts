import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { retirementGuard } from '../retirement'

function call(retired: boolean, path: string) {
  const guard = retirementGuard(retired)
  const req = { path } as Request
  let status = 200
  const res = {
    status(c: number) { status = c; return this },
    json() { return this },
  } as unknown as Response
  const next = vi.fn()
  guard(req, res, next)
  return { status, nexted: next.mock.calls.length > 0 }
}

describe('retirementGuard', () => {
  it('passes everything through when not retired', () => {
    expect(call(false, '/questions/feed')).toEqual({ status: 200, nexted: true })
  })

  it('503s data/auth routes when retired', () => {
    expect(call(true, '/questions/feed')).toEqual({ status: 503, nexted: false })
    expect(call(true, '/surveyors/login')).toEqual({ status: 503, nexted: false })
  })

  it('keeps /health and /privacy reachable when retired', () => {
    expect(call(true, '/health')).toEqual({ status: 200, nexted: true })
    expect(call(true, '/privacy')).toEqual({ status: 200, nexted: true })
  })
})

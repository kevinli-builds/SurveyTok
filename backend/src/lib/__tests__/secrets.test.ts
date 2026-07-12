import { describe, it, expect } from 'vitest'
import { safeSecretEqual } from '../secrets'

describe('safeSecretEqual', () => {
  it('matches equal secrets', () => {
    expect(safeSecretEqual('s3cret-value', 's3cret-value')).toBe(true)
  })

  it('rejects a wrong secret (incl. differing lengths)', () => {
    expect(safeSecretEqual('nope', 's3cret-value')).toBe(false)
    expect(safeSecretEqual('s3cret-valuE', 's3cret-value')).toBe(false)
  })

  it('rejects non-string headers and missing/empty expected', () => {
    expect(safeSecretEqual(['s3cret-value'], 's3cret-value')).toBe(false) // header array
    expect(safeSecretEqual(undefined, 's3cret-value')).toBe(false)
    expect(safeSecretEqual('anything', undefined)).toBe(false)
    expect(safeSecretEqual('anything', '')).toBe(false)
  })
})

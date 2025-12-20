import { describe, expect, it } from 'vitest'

import { isStaleBalanceYear, makeBalanceId } from '@/lib/balance'

describe('makeBalanceId', () => {
  it('builds a deterministic balance id', () => {
    expect(makeBalanceId('user-1', 'annual', 2025)).toBe('user-1__annual__2025')
  })
})

describe('isStaleBalanceYear', () => {
  it('flags balances older than two years', () => {
    expect(isStaleBalanceYear(2023, 2025)).toBe(true)
    expect(isStaleBalanceYear(2024, 2025)).toBe(false)
  })
})

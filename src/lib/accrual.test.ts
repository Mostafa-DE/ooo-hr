import { describe, expect, it } from 'vitest'

import { calculateAccrualReference } from './accrual'

describe('calculateAccrualReference', () => {
  it('computes entitlement minutes for valid months', () => {
    const result = calculateAccrualReference({
      annualEntitlementMinutes: 7200,
      joinMonth: 6,
      currentMonth: 12,
    })

    expect(result).toEqual({
      monthlyRateMinutes: 600,
      monthsSinceJoin: 7,
      entitlementMinutes: 4200,
      isValid: true,
    })
  })

  it('flags invalid when join month is after current month', () => {
    const result = calculateAccrualReference({
      annualEntitlementMinutes: 7200,
      joinMonth: 10,
      currentMonth: 8,
    })

    expect(result.isValid).toBe(false)
    expect(result.monthsSinceJoin).toBe(0)
    expect(result.entitlementMinutes).toBe(0)
  })
})


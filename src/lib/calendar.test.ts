import { describe, expect, it } from 'vitest'

import {
  addDays,
  getMonthWeeks,
  getWeekDays,
  isSameMonth,
  startOfMonth,
  startOfNextMonth,
} from '@/lib/calendar'

describe('calendar helpers', () => {
  it('builds week days starting on Monday', () => {
    const base = new Date(2024, 0, 17, 10, 0, 0, 0)
    const days = getWeekDays(base)

    expect(days).toHaveLength(7)
    expect(days[0]).toEqual(new Date(2024, 0, 15))
    expect(days[6]).toEqual(new Date(2024, 0, 21))
  })

  it('builds month weeks covering full month', () => {
    const weeks = getMonthWeeks(new Date(2024, 1, 10, 9, 0, 0, 0))

    expect(weeks.length).toBeGreaterThan(3)
    expect(weeks[0]).toHaveLength(7)
    expect(weeks[weeks.length - 1]).toHaveLength(7)
  })

  it('calculates month boundaries', () => {
    const base = new Date(2024, 5, 10, 9, 0, 0, 0)
    expect(startOfMonth(base)).toEqual(new Date(2024, 5, 1))
    expect(startOfNextMonth(base)).toEqual(new Date(2024, 6, 1))
  })

  it('checks same month', () => {
    expect(isSameMonth(new Date(2024, 0, 1), new Date(2024, 0, 31))).toBe(true)
    expect(isSameMonth(new Date(2024, 0, 31), new Date(2024, 1, 1))).toBe(false)
  })

  it('adds days', () => {
    expect(addDays(new Date(2024, 0, 1), 2)).toEqual(new Date(2024, 0, 3))
  })
})

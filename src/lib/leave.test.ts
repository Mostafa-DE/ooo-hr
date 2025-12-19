import { describe, expect, it } from 'vitest'

import {
  computeMinutes,
  filterApprovedRequests,
  formatDateRange,
  formatDateRangeWithYear,
  formatDuration,
  formatTimeRange,
  getDisplayEndDate,
  hasOverlap,
  overlaps,
  startOfDay,
  startOfNextWeek,
  startOfTomorrow,
  startOfWeek,
} from '@/lib/leave'
import type { LeaveRequest } from '@/types/leave'

describe('computeMinutes', () => {
  it('calculates minutes between dates', () => {
    const start = new Date('2024-01-01T10:00:00Z')
    const end = new Date('2024-01-01T12:30:00Z')

    expect(computeMinutes(start, end)).toBe(150)
  })
})

describe('formatDuration', () => {
  it('formats minutes into hours and minutes', () => {
    expect(formatDuration(150)).toBe('2h 30m')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(45)).toBe('45m')
  })
})

describe('hasOverlap', () => {
  const requests: LeaveRequest[] = [
    {
      id: 'req-1',
      employeeUid: 'user-1',
      teamId: 'team-1',
      type: 'annual',
      startAt: new Date('2024-01-02T09:00:00Z'),
      endAt: new Date('2024-01-02T11:00:00Z'),
      requestedMinutes: 120,
      status: 'SUBMITTED',
      note: null,
    },
  ]

  it('detects overlapping ranges', () => {
    expect(
      hasOverlap(
        requests,
        new Date('2024-01-02T10:00:00Z'),
        new Date('2024-01-02T12:00:00Z'),
      ),
    ).toBe(true)
  })

  it('returns false when ranges do not overlap', () => {
    expect(
      hasOverlap(
        requests,
        new Date('2024-01-02T12:00:00Z'),
        new Date('2024-01-02T13:00:00Z'),
      ),
    ).toBe(false)
  })
})

describe('filterApprovedRequests', () => {
  const requests: LeaveRequest[] = [
    {
      id: 'req-1',
      employeeUid: 'user-1',
      teamId: 'team-1',
      type: 'annual',
      startAt: new Date('2024-01-02T09:00:00Z'),
      endAt: new Date('2024-01-02T11:00:00Z'),
      requestedMinutes: 120,
      status: 'APPROVED',
      note: null,
    },
    {
      id: 'req-2',
      employeeUid: 'user-2',
      teamId: 'team-2',
      type: 'sick',
      startAt: new Date('2024-01-03T09:00:00Z'),
      endAt: new Date('2024-01-03T11:00:00Z'),
      requestedMinutes: 120,
      status: 'SUBMITTED',
      note: null,
    },
  ]

  it('filters approved requests only', () => {
    expect(filterApprovedRequests(requests)).toHaveLength(1)
  })

  it('filters approved requests by team', () => {
    const teamRequests = filterApprovedRequests(requests, 'team-1')
    expect(teamRequests).toHaveLength(1)
    expect(teamRequests[0].id).toBe('req-1')
  })
})

describe('date helpers', () => {
  it('calculates day boundaries', () => {
    const base = new Date(2024, 0, 15, 9, 30, 0, 0)
    expect(startOfDay(base)).toEqual(new Date(2024, 0, 15))
    expect(startOfTomorrow(base)).toEqual(new Date(2024, 0, 16))
  })

  it('calculates week boundaries on Monday', () => {
    const base = new Date(2024, 0, 17, 10, 0, 0, 0)
    expect(startOfWeek(base)).toEqual(new Date(2024, 0, 15))
    expect(startOfNextWeek(base)).toEqual(new Date(2024, 0, 22))
  })
})

describe('overlaps', () => {
  it('detects overlapping ranges', () => {
    const startA = new Date(2024, 0, 10, 9, 0, 0, 0)
    const endA = new Date(2024, 0, 10, 12, 0, 0, 0)
    const startB = new Date(2024, 0, 10, 11, 0, 0, 0)
    const endB = new Date(2024, 0, 10, 14, 0, 0, 0)

    expect(overlaps(startA, endA, startB, endB)).toBe(true)
  })

  it('returns false for non-overlapping ranges', () => {
    const startA = new Date(2024, 0, 10, 9, 0, 0, 0)
    const endA = new Date(2024, 0, 10, 12, 0, 0, 0)
    const startB = new Date(2024, 0, 10, 12, 0, 0, 0)
    const endB = new Date(2024, 0, 10, 14, 0, 0, 0)

    expect(overlaps(startA, endA, startB, endB)).toBe(false)
  })
})

describe('format helpers', () => {
  const baseRequest: LeaveRequest = {
    id: 'leave-1',
    employeeUid: 'user-1',
    teamId: 'team-1',
    type: 'annual',
    startAt: new Date(2024, 11, 19, 10, 0, 0, 0),
    endAt: new Date(2024, 11, 19, 13, 0, 0, 0),
    requestedMinutes: 180,
    status: 'APPROVED',
    note: null,
  }

  it('formats same-day partial leave time range', () => {
    expect(formatTimeRange(baseRequest)).toBe('10:00 → 13:00')
    expect(formatDateRange(baseRequest)).toBe('Dec 19')
    expect(formatDateRangeWithYear(baseRequest)).toBe('Dec 19, 2024')
  })

  it('formats full-day ranges', () => {
    const fullDay: LeaveRequest = {
      ...baseRequest,
      startAt: new Date(2024, 11, 19, 0, 0, 0, 0),
      endAt: new Date(2024, 11, 20, 0, 0, 0, 0),
    }

    expect(formatTimeRange(fullDay)).toBe('Full day')
    expect(formatDateRange(fullDay)).toBe('Dec 19')
    expect(formatDateRangeWithYear(fullDay)).toBe('Dec 19, 2024')
  })

  it('formats multi-day ranges', () => {
    const multiDay: LeaveRequest = {
      ...baseRequest,
      startAt: new Date(2024, 11, 19, 0, 0, 0, 0),
      endAt: new Date(2024, 11, 22, 0, 0, 0, 0),
    }

    expect(formatTimeRange(multiDay)).toBe('Full day')
    expect(formatDateRange(multiDay)).toBe('Dec 19 → Dec 21')
    expect(formatDateRangeWithYear(multiDay)).toBe('Dec 19, 2024 → Dec 21, 2024')
    expect(getDisplayEndDate(multiDay)).toEqual(new Date(2024, 11, 21, 0, 0, 0, 0))
  })
})

import type { LeaveRequest } from '@/types/leave'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DAILY_MINUTES = 480
const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4] as const

export function computeMinutes(start: Date, end: Date) {
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / 60000)
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfTomorrow(date: Date = new Date()) {
  return addDays(startOfDay(date), 1)
}

export function startOfWeek(date: Date = new Date()) {
  const start = startOfDay(date)
  const day = start.getDay()
  const diff = day
  return addDays(start, -diff)
}

export function startOfNextWeek(date: Date = new Date()) {
  return addDays(startOfWeek(date), 7)
}

export function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, minutes)
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60

  if (hours > 0 && remainder > 0) {
    return `${hours}h ${remainder}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${remainder}m`
}

export function formatDurationWithDays(
  minutes: number,
  dailyMinutes = DEFAULT_DAILY_MINUTES,
) {
  const safeMinutes = Math.max(0, minutes)
  if (dailyMinutes <= 0) {
    return formatDuration(safeMinutes)
  }

  const days = Math.floor(safeMinutes / dailyMinutes)
  const remainder = safeMinutes % dailyMinutes

  if (days > 0 && remainder === 0) {
    return days === 1 ? '1d' : `${days}d`
  }

  if (days > 0) {
    return `${days}d ${formatDuration(remainder)}`
  }

  return formatDuration(remainder)
}

export function formatDateTime(value: Date) {
  return value.toLocaleString()
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA
}

export function computeWorkingMinutes(
  start: Date,
  end: Date,
  options?: {
    workingDays?: readonly number[]
    dailyMinutes?: number
  },
) {
  if (end <= start) {
    return 0
  }

  const workingDays = options?.workingDays ?? DEFAULT_WORKING_DAYS
  const dailyMinutes = options?.dailyMinutes ?? DEFAULT_DAILY_MINUTES
  const startDay = startOfDay(start)
  const endDay = startOfDay(end)
  let total = 0
  let cursor = startDay

  while (cursor <= endDay) {
    const dayIndex = cursor.getDay()
    const isWorking = workingDays.includes(dayIndex)
    if (isWorking) {
      if (isSameDay(cursor, startDay) && isSameDay(cursor, endDay)) {
        const minutes = computeMinutes(start, end)
        total += Math.min(dailyMinutes, Math.max(0, minutes))
      } else if (isSameDay(cursor, startDay)) {
        const minutes = computeMinutes(start, addDays(cursor, 1))
        total += Math.min(dailyMinutes, Math.max(0, minutes))
      } else if (isSameDay(cursor, endDay)) {
        const minutes = computeMinutes(cursor, end)
        total += Math.min(dailyMinutes, Math.max(0, minutes))
      } else {
        total += dailyMinutes
      }
    }

    cursor = addDays(cursor, 1)
  }

  return total
}

export function isWorkingDay(date: Date, workingDays: readonly number[] = DEFAULT_WORKING_DAYS) {
  return workingDays.includes(date.getDay())
}

export function hasOverlap(
  requests: LeaveRequest[],
  startAt: Date,
  endAt: Date,
) {
  return requests.some((request) =>
    overlaps(startAt, endAt, request.startAt, request.endAt),
  )
}

export function filterApprovedRequests(
  requests: LeaveRequest[],
  teamId?: string | null,
) {
  return requests.filter((request) => {
    if (request.status !== 'APPROVED') {
      return false
    }

    if (teamId && request.teamId !== teamId) {
      return false
    }

    return true
  })
}

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return overlaps(startA, endA, startB, endB)
}

export function formatTimeRange(leave: LeaveRequest) {
  if (isFullDayRange(leave.startAt, leave.endAt)) {
    return null
  }

  if (isSameDay(leave.startAt, leave.endAt)) {
    return `${formatTime(leave.startAt)} → ${formatTime(leave.endAt)}`
  }

  return null
}

export function formatDateRange(leave: LeaveRequest) {
  const endDate = getDisplayEndDate(leave)

  if (isSameDay(leave.startAt, endDate)) {
    return formatDate(leave.startAt)
  }

  return `${formatDate(leave.startAt)} → ${formatDate(endDate)}`
}

export function formatDateRangeWithYear(leave: LeaveRequest) {
  const endDate = getDisplayEndDate(leave)

  if (isSameDay(leave.startAt, endDate)) {
    return formatDateWithYear(leave.startAt)
  }

  return `${formatDateWithYear(leave.startAt)} → ${formatDateWithYear(endDate)}`
}

export function getDisplayEndDate(leave: LeaveRequest) {
  return isFullDayRange(leave.startAt, leave.endAt)
    ? addDays(startOfDay(leave.endAt), -1)
    : leave.endAt
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateWithYear(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isStartOfDay(date: Date) {
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  )
}

function isFullDayRange(startAt: Date, endAt: Date) {
  if (!isStartOfDay(startAt) || !isStartOfDay(endAt)) {
    return false
  }

  const diff = endAt.getTime() - startAt.getTime()
  return diff >= DAY_MS && diff % DAY_MS === 0
}

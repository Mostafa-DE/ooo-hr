import type { LeaveRequest } from '@/types/leave'

const DAY_MS = 24 * 60 * 60 * 1000

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
  const diff = (day + 6) % 7
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

export function formatDateTime(value: Date) {
  return value.toLocaleString()
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA
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
    return 'Full day'
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

import { startOfDay, startOfNextWeek, startOfWeek } from '@/lib/leave'

export function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

export function startOfMonth(date: Date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfNextMonth(date: Date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

export function getWeekDays(date: Date = new Date()) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function getMonthWeeks(date: Date = new Date()) {
  const monthStart = startOfMonth(date)
  const monthEnd = startOfNextMonth(date)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = startOfNextWeek(addDays(monthEnd, -1))

  const weeks: Date[][] = []
  let cursor = calendarStart

  while (cursor < calendarEnd) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)))
    cursor = addDays(cursor, 7)
  }

  return weeks
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function clampToDay(date: Date) {
  return startOfDay(date)
}

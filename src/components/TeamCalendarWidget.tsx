import { type ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTeamCalendar } from '@/hooks/useTeamCalendar'
import {
  addDays,
  clampToDay,
  getMonthWeeks,
  getWeekDays,
  isSameMonth,
} from '@/lib/calendar'
import {
  formatDateRangeWithYear,
  formatDuration,
  formatTimeRange,
  getDisplayEndDate,
  overlaps,
  startOfDay,
  startOfNextWeek,
  startOfTomorrow,
  startOfWeek,
} from '@/lib/leave'
import type { LeaveRequest, LeaveType } from '@/types/leave'

const leaveTypeLabels: Record<LeaveType, string> = {
  annual: 'Annual',
  sick: 'Sick',
  unpaid: 'Unpaid',
  other: 'Other',
} as const

type TeamCalendarWidgetProps = {
  teamId: string | null
  showPendingBadge?: boolean
  includeAllTeams?: boolean
}

export function TeamCalendarWidget({
  teamId,
  showPendingBadge = false,
  includeAllTeams = false,
}: TeamCalendarWidgetProps) {
  const { requests, usersById, loading, error } = useTeamCalendar(teamId, includeAllTeams)
  const now = new Date()
  const todayStart = startOfDay(now)
  const tomorrowStart = startOfTomorrow(now)
  const weekStart = startOfWeek(now)
  const nextWeekStart = startOfNextWeek(now)
  const weekDays = getWeekDays(now)
  const monthWeeks = getMonthWeeks(now)

  const weekLeaves = requests.filter((request) =>
    overlaps(request.startAt, request.endAt, weekStart, nextWeekStart),
  )

  const monthLeaves = requests

  const statusMessage = (emptyText: string) => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Loading team leaves...</p>
    }

    if (error) {
      return (
        <p className="text-sm text-destructive">
          Failed to load team leaves.
        </p>
      )
    }

    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  const weekRows = buildLeaveRows(weekLeaves, weekStart, nextWeekStart)
  const todayHighlights = weekLeaves.filter((leave) =>
    overlaps(leave.startAt, leave.endAt, todayStart, tomorrowStart),
  )

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Team Out of Office</h2>
          {showPendingBadge ? (
            <Badge variant="outline">Pending approvals</Badge>
          ) : null}
          {includeAllTeams ? <Badge variant="secondary">All teams</Badge> : null}
        </div>
      </div>
      <Tabs defaultValue="week" className="mt-4">
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
        <TabsContent value="week">
          {weekLeaves.length === 0 ? (
            statusMessage('No approved leaves this week.')
          ) : (
            <div className="space-y-4">
              <CalendarWeekHeader days={weekDays} />
              <CalendarWeekGrid>
                {weekRows.map((row) => (
                  <CalendarLeaveBarRow
                    key={row.id}
                    row={row}
                    usersById={usersById}
                  />
                ))}
              </CalendarWeekGrid>
              {todayHighlights.length > 0 ? (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Today
                  </div>
                  <div className="mt-2 space-y-2">
                    {todayHighlights.map((leave) => (
                      <LeaveMeta key={leave.id} leave={leave} usersById={usersById} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>
        <TabsContent value="month">
          {monthLeaves.length === 0 ? (
            statusMessage('No approved leaves this month.')
          ) : (
            <div className="space-y-6">
              {monthWeeks.map((week) => {
                const weekStartDate = week[0]
                const weekEndDate = addDays(weekStartDate, 7)
                const weekLeavesForMonth = monthLeaves.filter((leave) =>
                  overlaps(leave.startAt, leave.endAt, weekStartDate, weekEndDate),
                )
                const rows = buildLeaveRows(weekLeavesForMonth, weekStartDate, weekEndDate)

                return (
                  <div key={weekStartDate.toISOString()} className="space-y-2">
                    <CalendarWeekHeader
                      days={week}
                      mutedMonth={now}
                    />
                    {rows.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No approved leaves.
                      </div>
                    ) : (
                      <CalendarWeekGrid>
                        {rows.map((row) => (
                          <CalendarLeaveBarRow
                            key={row.id}
                            row={row}
                            usersById={usersById}
                          />
                        ))}
                      </CalendarWeekGrid>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}

type LeaveRow = {
  id: string
  leave: LeaveRequest
  startIndex: number
  endIndex: number
}

function buildLeaveRows(
  leaves: LeaveRequest[],
  windowStart: Date,
  windowEnd: Date,
): LeaveRow[] {
  const sorted = [...leaves].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  )

  return sorted.map((leave) => {
    const clampedStart = leave.startAt > windowStart ? leave.startAt : windowStart
    const rawEnd = leave.endAt < windowEnd ? leave.endAt : windowEnd
    const displayEnd = getDisplayEndDate({ ...leave, endAt: rawEnd })
    const startDay = clampToDay(clampedStart)
    const endDay = clampToDay(displayEnd)
    const startIndex = Math.max(
      0,
      Math.min(6, Math.round((startDay.getTime() - windowStart.getTime()) / 86400000)),
    )
    const endIndex = Math.max(
      startIndex,
      Math.min(6, Math.round((endDay.getTime() - windowStart.getTime()) / 86400000)),
    )

    return {
      id: leave.id,
      leave,
      startIndex,
      endIndex,
    }
  })
}

function CalendarWeekHeader({
  days,
  mutedMonth,
}: {
  days: Date[]
  mutedMonth?: Date
}) {
  return (
    <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-muted-foreground">
      {days.map((day) => {
        const muted = mutedMonth ? !isSameMonth(day, mutedMonth) : false
        return (
          <div
            key={day.toISOString()}
            className={`rounded-md border border-border bg-muted/40 px-2 py-2 text-center ${
              muted ? 'opacity-50' : ''
            }`}
          >
            <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div className="text-sm text-foreground">{day.getDate()}</div>
          </div>
        )
      })}
    </div>
  )
}

function CalendarWeekGrid({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function CalendarLeaveBarRow({
  row,
  usersById,
}: {
  row: LeaveRow
  usersById: Record<string, { displayName: string; email: string }>
}) {
  const { leave, startIndex, endIndex } = row
  const profile = usersById[leave.employeeUid]
  const timeLabel = formatTimeRange(leave)
  const durationLabel =
    leave.requestedMinutes > 0 ? formatDuration(leave.requestedMinutes) : null
  const metaLabel = timeLabel === 'Full day' ? 'Full day' : 'Partial'
  const colorClass = getUserColorClass(leave.employeeUid)
  const columnStyle = {
    gridColumn: `${startIndex + 1} / ${endIndex + 2}`,
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      <div
        className={`rounded-md border border-border px-3 py-2 text-sm ${colorClass}`}
        style={columnStyle}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">{profile?.displayName ?? 'Employee'}</div>
          <span className="text-xs font-semibold uppercase tracking-wide">
            {leaveTypeLabels[leave.type]}
          </span>
        </div>
        <div className="mt-1 break-all text-xs text-muted-foreground">
          {profile?.email ?? '—'}
        </div>
        <div className="mt-1 text-xs">{formatDateRangeWithYear(leave)}</div>
        <div className="mt-1 text-xs">
          {metaLabel}
          {timeLabel && timeLabel !== 'Full day' ? ` · ${timeLabel}` : ''}
          {durationLabel ? ` · ${durationLabel}` : ''}
        </div>
      </div>
    </div>
  )
}

function LeaveMeta({
  leave,
  usersById,
}: {
  leave: LeaveRequest
  usersById: Record<string, { displayName: string; email: string }>
}) {
  const profile = usersById[leave.employeeUid]
  const timeLabel = formatTimeRange(leave)
  const durationLabel =
    leave.requestedMinutes > 0 ? formatDuration(leave.requestedMinutes) : null
  const metaLabel = timeLabel === 'Full day' ? 'Full day' : 'Partial'
  const colorClass = getUserColorClass(leave.employeeUid)

  return (
    <div className={`rounded-md border border-border px-3 py-2 text-sm ${colorClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">{profile?.displayName ?? 'Employee'}</div>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {leaveTypeLabels[leave.type]}
        </span>
      </div>
      <div className="mt-1 break-all text-xs text-muted-foreground">
        {profile?.email ?? '—'}
      </div>
      <div className="mt-1 text-xs">
        {formatDateRangeWithYear(leave)} · {metaLabel}
        {timeLabel && timeLabel !== 'Full day' ? ` · ${timeLabel}` : ''}
        {durationLabel ? ` · ${durationLabel}` : ''}
      </div>
    </div>
  )
}

const userColorClasses = [
  'bg-amber-50 text-amber-900',
  'bg-emerald-50 text-emerald-900',
  'bg-sky-50 text-sky-900',
  'bg-rose-50 text-rose-900',
  'bg-indigo-50 text-indigo-900',
  'bg-lime-50 text-lime-900',
] as const

function getUserColorClass(uid: string) {
  let hash = 0
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) % 997
  }
  return userColorClasses[hash % userColorClasses.length]
}

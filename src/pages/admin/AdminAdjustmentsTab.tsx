import { useMemo } from 'react'

import { LoadingState } from '@/components/LoadingState'
import { useAllLeaveBalanceAdjustments } from '@/hooks/useAllLeaveBalanceAdjustments'
import { useUsersList } from '@/hooks/useUsersList'
import { formatDateTime, formatDurationWithDays } from '@/lib/leave'
import type { LeaveBalanceAdjustment } from '@/types/balance'
import type { LeaveType } from '@/types/leave'

const leaveTypeOptions: LeaveType[] = ['annual', 'sick', 'unpaid', 'other']

function formatLeaveTypeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')
}

function formatAdjustmentDelta(minutes: number) {
  const label = formatDurationWithDays(Math.abs(minutes))
  return minutes >= 0 ? `+${label}` : `-${label}`
}

function buildUserLabel(
  userId: string,
  userLabelById: Map<string, string>,
  fallback = '—',
) {
  return userLabelById.get(userId) ?? fallback
}

export function AdminAdjustmentsTab() {
  const { adjustments, loading, error } = useAllLeaveBalanceAdjustments()
  const { users } = useUsersList()

  const userLabelById = useMemo(() => {
    return new Map(users.map((user) => [user.uid, user.displayName || user.email || '—']))
  }, [users])

  const groupedByYear = useMemo(() => {
    const yearMap = new Map<number, LeaveBalanceAdjustment[]>()
    adjustments.forEach((adjustment) => {
      const existing = yearMap.get(adjustment.year)
      if (existing) {
        existing.push(adjustment)
      } else {
        yearMap.set(adjustment.year, [adjustment])
      }
    })

    return Array.from(yearMap.entries())
      .map(([year, items]) => {
        const typeMap = new Map<string, LeaveBalanceAdjustment[]>()
        items.forEach((item) => {
          const existing = typeMap.get(item.leaveTypeId)
          if (existing) {
            existing.push(item)
          } else {
            typeMap.set(item.leaveTypeId, [item])
          }
        })

        const typeGroups = leaveTypeOptions
          .map((leaveType) => ({
            leaveType,
            items: typeMap.get(leaveType) ?? [],
          }))
          .filter((group) => group.items.length > 0)

        return { year, typeGroups }
      })
      .sort((a, b) => b.year - a.year)
  }, [adjustments])

  if (loading) {
    return <LoadingState variant="inline" title="Loading balance adjustments..." />
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load balance adjustments.</p>
  }

  return (
    <div className="space-y-4">
      {groupedByYear.length === 0 ? (
        <p className="text-sm text-muted-foreground">No balance adjustments yet.</p>
      ) : (
        groupedByYear.map((yearGroup) => (
          <div key={yearGroup.year} className="rounded-lg border bg-card p-4">
            <div className="text-base font-semibold">Year {yearGroup.year}</div>
            <div className="mt-4 space-y-4">
              {yearGroup.typeGroups.map((typeGroup) => (
                <div key={`${yearGroup.year}-${typeGroup.leaveType}`}>
                  <div className="text-sm font-semibold">
                    {formatLeaveTypeLabel(typeGroup.leaveType)} · {typeGroup.items.length}
                  </div>
                  <div className="mt-3 space-y-3">
                    {typeGroup.items.map((adjustment) => (
                      <div
                        key={adjustment.id}
                        className="rounded-md border bg-muted/20 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                          <span>{formatAdjustmentDelta(adjustment.deltaMinutes)}</span>
                          <span>
                            {adjustment.createdAt
                              ? formatDateTime(adjustment.createdAt)
                              : '—'}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <div>
                            Employee:{' '}
                            {buildUserLabel(adjustment.userId, userLabelById)}
                          </div>
                          <div>
                            Actor:{' '}
                            {adjustment.actorUid
                              ? buildUserLabel(adjustment.actorUid, userLabelById)
                              : '—'}
                          </div>
                          <div>Source: {adjustment.source}</div>
                          <div>Reference: {adjustment.reference ?? '—'}</div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Reason: {adjustment.reason || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

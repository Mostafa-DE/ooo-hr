import { useMemo, useState } from 'react'

import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { useUsersList } from '@/hooks/useUsersList'
import { formatDurationWithDays } from '@/lib/leave'
import { cn } from '@/lib/utils'
import type { LeaveBalanceAdjustment } from '@/types/balance'
import type { LeaveType } from '@/types/leave'

type UserBalanceAdjustmentsSectionProps = {
  adjustments: LeaveBalanceAdjustment[]
  loading: boolean
}

const leaveTypes: LeaveType[] = ['annual', 'sick', 'unpaid', 'other']

function formatLeaveTypeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')
}

function formatAdjustmentDelta(minutes: number) {
  const label = formatDurationWithDays(Math.abs(minutes))
  return minutes >= 0 ? `+${label}` : `-${label}`
}

export function UserBalanceAdjustmentsSection({
  adjustments,
  loading,
}: UserBalanceAdjustmentsSectionProps) {
  const { users } = useUsersList()

  // Filter state
  const [filterYear, setFilterYear] = useState<number | 'all'>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'admin' | 'system'>('all')
  const [filterLeaveType, setFilterLeaveType] = useState<string | 'all'>('all')

  const userNameById = useMemo(() => {
    return new Map(users.map((user) => [user.uid, user.displayName]))
  }, [users])

  const getUserLabel = (uid: string) => userNameById.get(uid) ?? uid

  // Extract available filter options
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    adjustments.forEach((adj) => years.add(adj.year))
    return Array.from(years).sort((a, b) => b - a)
  }, [adjustments])

  const availableLeaveTypes = useMemo(() => {
    const types = new Set<string>()
    adjustments.forEach((adj) => types.add(adj.leaveTypeId))
    return Array.from(types).sort()
  }, [adjustments])

  // Filter and group adjustments by leave type
  const groupedAdjustments = useMemo(() => {
    // First, filter the adjustments
    const filtered = adjustments.filter((adjustment) => {
      if (filterYear !== 'all' && adjustment.year !== filterYear) {
        return false
      }
      if (filterSource !== 'all' && adjustment.source !== filterSource) {
        return false
      }
      if (filterLeaveType !== 'all' && adjustment.leaveTypeId !== filterLeaveType) {
        return false
      }
      return true
    })

    // Then group by leave type
    return leaveTypes
      .map((leaveType) => {
        const typeAdjustments = filtered
          .filter((adjustment) => adjustment.leaveTypeId === leaveType)
          .sort((a, b) => {
            // Sort by date descending
            const aTime = a.createdAt?.getTime() ?? 0
            const bTime = b.createdAt?.getTime() ?? 0
            return bTime - aTime
          })
        return {
          leaveType,
          adjustments: typeAdjustments,
        }
      })
      .filter((group) => group.adjustments.length > 0)
  }, [adjustments, filterYear, filterSource, filterLeaveType])

  if (loading) {
    return <LoadingState variant="inline" title="Loading adjustments..." />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {adjustments.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          {/* Year filter */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Year</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterYear === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterYear('all')}
              >
                All
              </Button>
              {availableYears.map((year) => (
                <Button
                  key={year}
                  variant={filterYear === year ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>

          {/* Source filter */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Source</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterSource === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSource('all')}
              >
                All
              </Button>
              <Button
                variant={filterSource === 'admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSource('admin')}
              >
                Admin
              </Button>
              <Button
                variant={filterSource === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSource('system')}
              >
                System
              </Button>
            </div>
          </div>

          {/* Leave type filter */}
          {availableLeaveTypes.length > 1 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Leave type</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterLeaveType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterLeaveType('all')}
                >
                  All
                </Button>
                {availableLeaveTypes.map((type) => (
                  <Button
                    key={type}
                    variant={filterLeaveType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterLeaveType(type)}
                  >
                    {formatLeaveTypeLabel(type)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjustments display */}
      {adjustments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No adjustments found</p>
      ) : groupedAdjustments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No adjustments match the selected filters
        </p>
      ) : (
        <div className="space-y-6">
          {groupedAdjustments.map((group) => (
            <div key={group.leaveType} className="space-y-3">
              <h3 className="text-base font-semibold">
                {formatLeaveTypeLabel(group.leaveType)} · {group.adjustments.length}
              </h3>
              <div className="space-y-3">
                {group.adjustments.map((adjustment) => (
                  <div
                    key={adjustment.id}
                    className="rounded-md border bg-muted/20 p-3 sm:p-4 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <span className="text-sm font-semibold">
                        Year {adjustment.year}
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold',
                          adjustment.deltaMinutes >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        )}
                      >
                        {formatAdjustmentDelta(adjustment.deltaMinutes)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {adjustment.createdAt
                          ? adjustment.createdAt.toLocaleString()
                          : '—'}
                      </div>
                      <div>
                        <span className="font-medium">Actor:</span>{' '}
                        {adjustment.actorUid ? getUserLabel(adjustment.actorUid) : '—'}
                      </div>
                      <div>
                        <span className="font-medium">Source:</span>{' '}
                        {adjustment.source}
                      </div>
                      <div>
                        <span className="font-medium">Reference:</span>{' '}
                        {adjustment.reference ?? '—'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Reason:</span>{' '}
                      {adjustment.reason || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

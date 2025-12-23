import { useMemo, useState } from 'react'

import { useAuth } from '@/auth/useAuth'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { useLeaveBalanceAdjustments } from '@/hooks/useLeaveBalanceAdjustments'
import { formatDateTime, formatDurationWithDays } from '@/lib/leave'

export function BalanceAdjustmentsPage() {
  const { user } = useAuth()
  const { adjustments, loading, error } = useLeaveBalanceAdjustments(user?.uid ?? null)

  // Filter state
  const [filterYear, setFilterYear] = useState<number | 'all'>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'admin' | 'system'>('all')
  const [filterLeaveType, setFilterLeaveType] = useState<string | 'all'>('all')

  const formatAdjustmentDelta = (minutes: number) => {
    const label = formatDurationWithDays(Math.abs(minutes))
    return minutes >= 0 ? `+${label}` : `-${label}`
  }

  const formatAdjustmentActor = (uid: string) => {
    if (user && uid === user.uid) {
      return 'You'
    }
    return 'Admin'
  }

  const formatLeaveTypeLabel = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')

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

  // Apply filters and group adjustments
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
    const grouped = new Map<string, typeof filtered>()
    filtered.forEach((adjustment) => {
      const existing = grouped.get(adjustment.leaveTypeId)
      if (existing) {
        existing.push(adjustment)
      } else {
        grouped.set(adjustment.leaveTypeId, [adjustment])
      }
    })

    return Array.from(grouped.entries())
      .map(([leaveType, items]) => {
        const yearMap = new Map<number, typeof items>()
        items.forEach((item) => {
          const existing = yearMap.get(item.year)
          if (existing) {
            existing.push(item)
          } else {
            yearMap.set(item.year, [item])
          }
        })
        const years = Array.from(yearMap.entries())
          .map(([year, yearItems]) => ({ year, items: yearItems }))
          .sort((a, b) => b.year - a.year)

        return { leaveType, years }
      })
      .sort((a, b) => a.leaveType.localeCompare(b.leaveType))
  }, [adjustments, filterYear, filterSource, filterLeaveType])

  if (loading) {
    return <LoadingState variant="inline" title="Loading adjustments..." />
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load adjustments.</p>
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My Balances</h1>
        <p className="text-sm text-muted-foreground">
          View your leave balance history and adjustments.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        {/* Filters */}
        {adjustments.length > 0 && (
          <div className="mb-4 space-y-3">
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

        <div className="space-y-3">
          {groupedAdjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {adjustments.length === 0
                ? 'No balance adjustments yet.'
                : 'No adjustments match the selected filters.'}
            </p>
          ) : (
            <div className="space-y-3">
              {groupedAdjustments.map((group) => (
                <div key={group.leaveType} className="rounded-md border bg-muted/20 p-3">
                  <div className="text-sm font-semibold">
                    {formatLeaveTypeLabel(group.leaveType)} ·{' '}
                    {group.years.reduce((sum, yearGroup) => sum + yearGroup.items.length, 0)}
                  </div>
                  <div className="mt-3 space-y-4">
                    {group.years.map((yearGroup) => (
                      <div key={`${group.leaveType}-${yearGroup.year}`}>
                        <div className="text-xs font-semibold text-muted-foreground">
                          Year {yearGroup.year}
                        </div>
                        <div className="mt-2 space-y-3">
                          {yearGroup.items.map((adjustment) => (
                            <div
                              key={adjustment.id}
                              className="rounded-md border bg-background p-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                                <span>
                                  {adjustment.createdAt
                                    ? formatDateTime(adjustment.createdAt)
                                    : '—'}{' '}
                                  · {formatAdjustmentActor(adjustment.actorUid)}
                                </span>
                                <span>{formatAdjustmentDelta(adjustment.deltaMinutes)}</span>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Reason: {adjustment.reason || '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

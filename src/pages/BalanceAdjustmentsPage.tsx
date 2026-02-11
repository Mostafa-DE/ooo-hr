import { useMemo, useState } from 'react'

import { useAuth } from '@/auth/useAuth'
import { LoadingState } from '@/components/LoadingState'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
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
    <section className="space-y-3">
      <h1 className="text-lg font-semibold tracking-tight">My Balances</h1>

      <div>
        {/* Filters */}
        {adjustments.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* Year filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Year</span>
              <div className="flex gap-1">
                <Button
                  variant={filterYear === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFilterYear('all')}
                >
                  All
                </Button>
                {availableYears.map((year) => (
                  <Button
                    key={year}
                    variant={filterYear === year ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFilterYear(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </div>

            {/* Source filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Source</span>
              <div className="flex gap-1">
                <Button
                  variant={filterSource === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFilterSource('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterSource === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFilterSource('admin')}
                >
                  Admin
                </Button>
                <Button
                  variant={filterSource === 'system' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFilterSource('system')}
                >
                  System
                </Button>
              </div>
            </div>

            {/* Leave type filter */}
            {availableLeaveTypes.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Type</span>
                <div className="flex gap-1">
                  <Button
                    variant={filterLeaveType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFilterLeaveType('all')}
                  >
                    All
                  </Button>
                  {availableLeaveTypes.map((type) => (
                    <Button
                      key={type}
                      variant={filterLeaveType === type ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-2 text-xs"
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
            <Accordion type="multiple" className="space-y-3">
              {groupedAdjustments.map((group) =>
                group.years.map((yearGroup) => {
                  const key = `${group.leaveType}-${yearGroup.year}`
                  const totalDelta = yearGroup.items.reduce(
                    (sum, adj) => sum + adj.deltaMinutes,
                    0,
                  )
                  return (
                    <AccordionItem
                      key={key}
                      value={key}
                      className="rounded-md border bg-muted/20 px-3"
                    >
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatLeaveTypeLabel(group.leaveType)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {yearGroup.year}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {yearGroup.items.length} adjustment
                            {yearGroup.items.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs font-semibold">
                            {formatAdjustmentDelta(totalDelta)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
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
                      </AccordionContent>
                    </AccordionItem>
                  )
                }),
              )}
            </Accordion>
          )}
        </div>
      </div>
    </section>
  )
}

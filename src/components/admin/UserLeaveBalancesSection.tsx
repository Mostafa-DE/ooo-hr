import { useMemo } from 'react'

import { LoadingState } from '@/components/LoadingState'
import { Badge } from '@/components/ui/badge'
import { formatDurationWithDays } from '@/lib/leave'
import type { LeaveBalance } from '@/types/balance'
import type { LeaveType } from '@/types/leave'

type UserLeaveBalancesSectionProps = {
  balances: LeaveBalance[]
  loading: boolean
}

const leaveTypes: LeaveType[] = ['annual', 'sick', 'unpaid', 'other']

function formatLeaveTypeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')
}

function formatDate(value: Date | { toDate: () => Date }): string {
  if (value instanceof Date) {
    return value.toLocaleDateString()
  }
  return value.toDate().toLocaleDateString()
}

export function UserLeaveBalancesSection({
  balances,
  loading,
}: UserLeaveBalancesSectionProps) {
  const currentYear = new Date().getFullYear()

  // Group balances by leave type
  const groupedBalances = useMemo(() => {
    return leaveTypes
      .map((leaveType) => {
        const typeBalances = balances
          .filter((balance) => balance.leaveTypeId === leaveType)
          .sort((a, b) => b.year - a.year) // Descending by year
        return {
          leaveType,
          balances: typeBalances,
        }
      })
      .filter((group) => group.balances.length > 0)
  }, [balances])

  if (loading) {
    return <LoadingState variant="inline" title="Loading balances..." />
  }

  return (
    <div className="space-y-4">
      {balances.length === 0 ? (
        <p className="text-sm text-muted-foreground">No balances found</p>
      ) : (
        <div className="space-y-6">
          {groupedBalances.map((group) => (
            <div key={group.leaveType} className="space-y-3">
              <h3 className="text-base font-semibold">
                {formatLeaveTypeLabel(group.leaveType)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.balances.map((balance) => (
                  <div
                    key={balance.id}
                    className="rounded-lg border bg-muted/20 p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium">Year {balance.year}</span>
                      {balance.year === currentYear && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold">
                      {formatDurationWithDays(balance.balanceMinutes)}
                    </div>
                    {balance.lastCarryoverAt && balance.lastCarryoverFromYear ? (
                      <div className="text-xs text-muted-foreground">
                        Carried from {balance.lastCarryoverFromYear} on{' '}
                        {formatDate(balance.lastCarryoverAt)}
                      </div>
                    ) : null}
                    {balance.updatedAt ? (
                      <div className="text-xs text-muted-foreground">
                        Updated: {formatDate(balance.updatedAt)}
                      </div>
                    ) : null}
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

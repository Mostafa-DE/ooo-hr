import { useMemo } from 'react'
import { TeamCalendarWidget } from '@/components/TeamCalendarWidget'
import { useAuth } from '@/auth/useAuth'
import { useLeaveBalances } from '@/hooks/useLeaveBalances'
import { useUserProfile } from '@/hooks/useUserProfile'
import { formatDurationWithDays } from '@/lib/leave'
import type { LeaveType } from '@/types/leave'

const leaveTypes: LeaveType[] = ['annual', 'sick', 'unpaid', 'other']

export function HomePage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { balances } = useLeaveBalances(user?.uid ?? null)
  const showAdminWidget = profile?.role === 'admin'
  const showTeamWidget = profile?.role !== 'admin' && Boolean(profile?.teamId)

  const currentYear = new Date().getFullYear()
  const balancesByType = useMemo(() => {
    const map = new Map<LeaveType, number>()
    balances
      .filter((balance) => balance.year === currentYear)
      .forEach((balance) => {
        map.set(balance.leaveTypeId as LeaveType, balance.balanceMinutes)
      })
    return map
  }, [balances, currentYear])

  const formatBalance = (minutes: number | undefined) => {
    if (minutes === undefined) {
      return '—'
    }
    return formatDurationWithDays(minutes)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">OOO</h1>
        <p className="text-sm text-muted-foreground">
          Team visibility for approved leave requests.
        </p>
      </div>
      {user && !showAdminWidget ? (
        <div className="rounded-xl border bg-card p-6 text-card-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Balance overview ({currentYear})</h2>
            <p className="text-sm text-muted-foreground">Minutes shown as days/hours.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {leaveTypes.map((leaveType) => (
              <div key={leaveType} className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {leaveType.replace('_', ' ')}
                </div>
                <div className="mt-1 font-semibold">
                  {formatBalance(balancesByType.get(leaveType))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {showAdminWidget ? (
        <TeamCalendarWidget teamId={null} includeAllTeams />
      ) : null}
      {showTeamWidget && profile?.teamId ? (
        <TeamCalendarWidget teamId={profile.teamId} />
      ) : null}
    </div>
  )
}

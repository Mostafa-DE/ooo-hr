import { Link } from 'react-router-dom'

import { TeamCalendarWidget } from '@/components/TeamCalendarWidget'
import { Button } from '@/components/ui/button'
import { useUserProfile } from '@/hooks/useUserProfile'

export function HomePage() {
  const { profile } = useUserProfile()
  const showRequestCta = profile?.role !== 'admin'
  const showAdminWidget = profile?.role === 'admin'
  const showTeamWidget = profile?.role !== 'admin' && Boolean(profile?.teamId)
  const showPendingBadge = profile?.role === 'team_lead' || profile?.role === 'manager'

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">OOO</h1>
        <p className="text-sm text-muted-foreground">
          Team visibility for approved leave requests.
        </p>
      </div>
      {showRequestCta ? (
        <Button asChild>
          <Link to="/request">Request Leave</Link>
        </Button>
      ) : null}
      {showAdminWidget ? (
        <TeamCalendarWidget teamId={null} includeAllTeams />
      ) : null}
      {showTeamWidget && profile?.teamId ? (
        <TeamCalendarWidget teamId={profile.teamId} showPendingBadge={showPendingBadge} />
      ) : null}
    </div>
  )
}

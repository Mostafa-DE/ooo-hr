import { Link, useNavigate, useParams } from 'react-router-dom'

import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserProfileSection } from '@/components/admin/UserProfileSection'
import { UserLeaveRequestsSection } from '@/components/admin/UserLeaveRequestsSection'
import { UserLeaveBalancesSection } from '@/components/admin/UserLeaveBalancesSection'
import { UserBalanceAdjustmentsSection } from '@/components/admin/UserBalanceAdjustmentsSection'
import { useUsersList } from '@/hooks/useUsersList'
import { useLeaveRequests } from '@/hooks/useLeaveRequests'
import { useLeaveBalances } from '@/hooks/useLeaveBalances'
import { useLeaveBalanceAdjustments } from '@/hooks/useLeaveBalanceAdjustments'
import { useTeam } from '@/hooks/useTeam'
import { useUserProfile } from '@/hooks/useUserProfile'

export function AdminUserDetailsPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { profile } = useUserProfile()

  // Fetch all data
  const { users, loading: usersLoading } = useUsersList()
  const user = users.find((u) => u.uid === userId)
  const { requests, loading: requestsLoading } = useLeaveRequests(userId ?? null)
  const { balances, loading: balancesLoading } = useLeaveBalances(userId ?? null)
  const { adjustments, loading: adjustmentsLoading } = useLeaveBalanceAdjustments(
    userId ?? null
  )
  const { team, loading: teamLoading } = useTeam(user?.teamId ?? null)

  // Permission check: only admins can access
  if (profile && profile.role !== 'admin') {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don&apos;t have permission to view user details.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </section>
    )
  }

  // Show page-level loading state while fetching user list
  if (usersLoading) {
    return <LoadingState variant="inline" title="Loading user details..." />
  }

  // Handle invalid user ID
  if (!userId || userId.trim() === '') {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-xl font-semibold text-destructive">Invalid User ID</h2>
          <p className="text-muted-foreground mt-2">
            The provided user ID is invalid.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate('/admin')}
          >
            Back to Admin
          </Button>
        </div>
      </section>
    )
  }

  // Handle user not found
  if (!user) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-xl font-semibold text-destructive">User Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The user with ID &quot;{userId}&quot; could not be found.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate('/admin')}
          >
            Back to Admin
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground transition-colors">
          Admin
        </Link>
        <span>→</span>
        <span>Users</span>
        <span>→</span>
        <span className="text-foreground font-medium">{user.displayName}</span>
      </div>

      {/* Profile Section - Always Visible */}
      <UserProfileSection user={user} team={team} loading={teamLoading} />

      {/* Tabs for Other Sections */}
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Leave Requests</TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments History</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <UserLeaveRequestsSection requests={requests} loading={requestsLoading} />
        </TabsContent>

        <TabsContent value="balances">
          <UserLeaveBalancesSection balances={balances} loading={balancesLoading} />
        </TabsContent>

        <TabsContent value="adjustments">
          <UserBalanceAdjustmentsSection
            adjustments={adjustments}
            loading={adjustmentsLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Back Button */}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => navigate('/admin')}>
          Back to Admin
        </Button>
      </div>
    </section>
  )
}

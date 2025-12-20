import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserProfile } from '@/hooks/useUserProfile'
import { AdminAdjustmentsTab } from '@/pages/admin/AdminAdjustmentsTab'
import { AdminTeamsTab } from '@/pages/admin/AdminTeamsTab'
import { AdminUsersTab } from '@/pages/admin/AdminUsersTab'

export function AdminPage() {
  const { profile, loading, error } = useUserProfile()

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading admin tools...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">Unable to load your profile.</p>
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="text-muted-foreground">
          You don&apos;t have access to the admin dashboard.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">
          Manage users, teams, and access permissions.
        </p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="adjustments">Balance adjustments</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <AdminUsersTab />
        </TabsContent>
        <TabsContent value="teams">
          <AdminTeamsTab />
        </TabsContent>
        <TabsContent value="adjustments">
          <AdminAdjustmentsTab />
        </TabsContent>
      </Tabs>
    </section>
  )
}

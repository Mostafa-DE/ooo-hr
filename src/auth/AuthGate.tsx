import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { AccessDeniedPage } from '@/pages/AccessDeniedPage'
import { canAccessApp, getAccessIssues } from '@/lib/access'
import { useUserProfile } from '@/hooks/useUserProfile'

export function AuthGate() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()

  if (authLoading || profileLoading) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Loading…</h1>
        <p className="text-muted-foreground">Preparing your workspace.</p>
      </section>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessApp(profile)) {
    return <AccessDeniedPage issues={getAccessIssues(profile)} />
  }

  return <Outlet />
}

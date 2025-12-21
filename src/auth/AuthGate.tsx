import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { LoadingState } from '@/components/LoadingState'
import { AccessDeniedPage } from '@/pages/AccessDeniedPage'
import { canAccessApp, getAccessIssues } from '@/lib/access'
import { useUserProfile } from '@/hooks/useUserProfile'

export function AuthGate() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()

  if (authLoading || profileLoading) {
    return (
      <LoadingState
        title="Loading..."
        description="Preparing your workspace."
      />
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

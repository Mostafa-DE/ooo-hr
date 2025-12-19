import { Navigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { AccessDeniedPage } from '@/pages/AccessDeniedPage'
import { Button } from '@/components/ui/button'
import { canAccessApp, getAccessIssues } from '@/lib/access'
import { useUserProfile } from '@/hooks/useUserProfile'

export function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()

  if (authLoading || profileLoading) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Loading…</h1>
        <p className="text-muted-foreground">Checking your account access.</p>
      </section>
    )
  }

  if (user && canAccessApp(profile)) {
    return <Navigate to="/" replace />
  }

  if (user && !canAccessApp(profile)) {
    return <AccessDeniedPage issues={getAccessIssues(profile)} />
  }

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">OOO</h1>
        <p className="text-muted-foreground">Internal tool for tracking leaves.</p>
      </div>
      <Button onClick={() => signIn()}>Sign in with Google</Button>
    </section>
  )
}

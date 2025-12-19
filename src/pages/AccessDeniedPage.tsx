import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import type { AccessIssue } from '@/lib/access'

const issueLabels: Record<AccessIssue, string> = {
  not_whitelisted: 'Your account is not whitelisted yet.',
  no_team: 'You are not assigned to a team.',
}

type AccessDeniedPageProps = {
  issues: AccessIssue[]
}

export function AccessDeniedPage({ issues }: AccessDeniedPageProps) {
  const { user, signOut } = useAuth()

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Access denied</h1>
        <p className="text-muted-foreground">
          You don&apos;t have access yet. Contact an admin to update your account.
        </p>
        {user?.email ? (
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
        ) : null}
      </div>
      <div className="rounded-lg border bg-card p-4 text-sm text-card-foreground">
        <ul className="space-y-1">
          {issues.map((issue) => (
            <li key={issue}>{issueLabels[issue]}</li>
          ))}
        </ul>
      </div>
      <Button variant="secondary" onClick={() => signOut()}>
        Sign out
      </Button>
    </section>
  )
}

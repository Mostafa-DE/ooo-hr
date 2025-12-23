import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import type { AccessIssue } from '@/lib/access'

const issueLabels: Record<AccessIssue, { title: string; description: string }> = {
  not_whitelisted: {
    title: 'Account not whitelisted',
    description: 'Your email address needs to be added to the whitelist by an administrator.',
  },
  no_team: {
    title: 'No team assignment',
    description: 'You need to be assigned to a team before accessing the system.',
  },
}

type AccessDeniedPageProps = {
  issues: AccessIssue[]
}

export function AccessDeniedPage({ issues }: AccessDeniedPageProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="mx-auto w-full max-w-md space-y-6 rounded-xl border bg-card p-8 text-card-foreground shadow-lg">
        {/* Logo and Header */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <img src="/ooo.png" alt="OOO" className="h-16 w-16" />

          {/* Lock Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to access this application yet.
            </p>
          </div>
        </div>

        {/* User Info */}
        {user?.email ? (
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="mt-1 font-medium text-sm">{user.email}</p>
          </div>
        ) : null}

        {/* Issues List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">What&apos;s needed:</h2>
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue}
                className="rounded-lg border border-destructive/20 bg-destructive/5 p-3"
              >
                <div className="flex gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20">
                      <svg
                        className="h-3 w-3 text-destructive"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{issueLabels[issue].title}</p>
                    <p className="text-xs text-muted-foreground">
                      {issueLabels[issue].description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="space-y-3 pt-2">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Please contact your administrator to resolve these issues.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => signOut()}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </section>
    </div>
  )
}

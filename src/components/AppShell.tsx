import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { buttonVariants } from '@/components/ui/buttonVariants'
import { navigationItems } from '@/constants/navigation'
import { useTeam } from '@/hooks/useTeam'
import { useUserProfile } from '@/hooks/useUserProfile'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { user, signOut } = useAuth()
  const { profile } = useUserProfile()
  const { team } = useTeam(profile?.teamId ?? null)
  const displayName = user?.displayName ?? 'Employee'
  const email = user?.email ?? ''
  const photoURL = user?.photoURL ?? null
  const role = profile?.role
  const isAdmin = role === 'admin'
  const isTeamLead = Boolean(team && user && team.leadUid === user.uid)
  const isManager = Boolean(team && user && team.managerUid === user.uid)
  const canSeeApprovals = isAdmin || isTeamLead || isManager
  const roleClassName =
    role === 'admin'
      ? 'bg-amber-100 text-amber-800'
      : role === 'manager'
        ? 'bg-emerald-100 text-emerald-800'
        : role === 'team_lead'
          ? 'bg-sky-100 text-sky-800'
          : 'bg-slate-100 text-slate-800'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="text-lg font-semibold tracking-tight">OOO</div>
            <nav className="flex flex-wrap items-center gap-2">
              {navigationItems
                .filter((item) => (item.to === '/admin' ? isAdmin : true))
                .filter((item) => (item.to === '/approvals' ? canSeeApprovals : true))
                .filter((item) =>
                  isAdmin && (item.to === '/request' || item.to === '/my-requests') ? false : true,
                )
                .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' }),
                      'text-sm',
                      isActive && 'bg-accent text-accent-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
                ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="h-9 w-9 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-muted-foreground">
                  {displayName.charAt(0)}
                </div>
              )}
              <div className="hidden sm:flex sm:flex-col">
                <span className="text-sm font-medium">
                  {displayName}
                  {role ? (
                    <span
                      className={cn(
                        'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                        roleClassName,
                      )}
                    >
                      {role.replace('_', ' ')}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">{email}</span>
              </div>
            </div>
            <button
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}

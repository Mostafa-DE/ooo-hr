import { Badge } from '@/components/ui/badge'
import type { UserProfile } from '@/types/user'
import type { Team } from '@/types/team'

type UserProfileSectionProps = {
  user: UserProfile
  team: Team | null
  loading: boolean
}

export function UserProfileSection({ user, team, loading }: UserProfileSectionProps) {
  const formatDate = (timestamp?: { toDate: () => Date }) => {
    if (!timestamp) return '—'
    return timestamp.toDate().toLocaleDateString()
  }

  const formatDateTime = (timestamp?: { toDate: () => Date }) => {
    if (!timestamp) return '—'
    return timestamp.toDate().toLocaleString()
  }

  return (
    <div className="rounded-lg border bg-card/60 p-3 sm:p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">Name</div>
            <div className="font-medium break-words">{user.displayName}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">Email</div>
            <div className="font-medium break-all">{user.email}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">Role</div>
            <div className="mt-1">
              <Badge variant="outline">{user.role.replace('_', ' ')}</Badge>
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">Team</div>
            <div className="font-medium">
              {loading ? (
                <span className="text-muted-foreground text-xs">Loading...</span>
              ) : (
                team?.name ?? 'Unassigned'
              )}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Whitelist Status
            </div>
            <div className="mt-1">
              <Badge variant={user.isWhitelisted ? 'default' : 'outline'}>
                {user.isWhitelisted ? 'Whitelisted' : 'Blocked'}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">Join Date</div>
            <div className="font-medium">{formatDate(user.joinDate)}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">Last Login</div>
            <div className="font-medium">{formatDateTime(user.lastLoginAt)}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">Created At</div>
            <div className="font-medium">{formatDateTime(user.createdAt)}</div>
          </div>
      </div>
    </div>
  )
}

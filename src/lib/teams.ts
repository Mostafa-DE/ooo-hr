import type { Team } from '@/types/team'
import type { UserProfile } from '@/types/user'

export function normalizeTeamName(name: string) {
  return name.trim().toLowerCase()
}

export function isDuplicateTeamName(
  teams: Team[],
  name: string,
  excludeId?: string | null,
) {
  const normalized = normalizeTeamName(name)
  if (!normalized) {
    return false
  }

  return teams.some((team) => {
    if (excludeId && team.id === excludeId) {
      return false
    }

    return normalizeTeamName(team.name) === normalized
  })
}

export function findTeamLeadConflict(
  users: UserProfile[],
  teamId: string,
  selectedLeadUid: string | null,
) {
  return (
    users.find(
      (user) =>
        user.teamId === teamId &&
        user.role === 'team_lead' &&
        user.uid !== selectedLeadUid,
    ) ?? null
  )
}

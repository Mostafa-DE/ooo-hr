import type { UserProfile } from '@/types/user'

export type AccessIssue = 'not_whitelisted' | 'no_team'

export function getAccessIssues(profile: UserProfile | null): AccessIssue[] {
  if (!profile) {
    return ['not_whitelisted', 'no_team']
  }

  const issues: AccessIssue[] = []

  if (profile.isWhitelisted !== true) {
    issues.push('not_whitelisted')
  }

  if (profile.role !== 'admin' && !profile.teamId) {
    issues.push('no_team')
  }

  return issues
}

export function canAccessApp(profile: UserProfile | null) {
  return getAccessIssues(profile).length === 0
}

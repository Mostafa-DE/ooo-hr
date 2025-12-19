import { describe, expect, it } from 'vitest'

import { findTeamLeadConflict, isDuplicateTeamName, normalizeTeamName } from '@/lib/teams'
import type { Team } from '@/types/team'
import type { UserProfile } from '@/types/user'

describe('normalizeTeamName', () => {
  it('normalizes whitespace and casing', () => {
    expect(normalizeTeamName('  Design ')).toBe('design')
  })
})

describe('isDuplicateTeamName', () => {
  const teams: Team[] = [
    {
      id: 'team-1',
      name: 'Design',
      leadUid: null,
      managerUid: null,
    },
    {
      id: 'team-2',
      name: 'Engineering',
      leadUid: null,
      managerUid: null,
    },
  ]

  it('detects duplicates ignoring case', () => {
    expect(isDuplicateTeamName(teams, 'design')).toBe(true)
  })

  it('allows the same name when excluding an id', () => {
    expect(isDuplicateTeamName(teams, 'Design', 'team-1')).toBe(false)
  })
})

describe('findTeamLeadConflict', () => {
  const users: UserProfile[] = [
    {
      uid: 'user-1',
      email: 'lead@example.com',
      displayName: 'Lead',
      photoURL: null,
      isWhitelisted: true,
      role: 'team_lead',
      teamId: 'team-1',
    },
    {
      uid: 'user-2',
      email: 'employee@example.com',
      displayName: 'Employee',
      photoURL: null,
      isWhitelisted: true,
      role: 'employee',
      teamId: 'team-1',
    },
  ]

  it('returns a conflict when another lead exists in the team', () => {
    expect(findTeamLeadConflict(users, 'team-1', 'user-2')?.uid).toBe('user-1')
  })

  it('returns null when selecting the same lead', () => {
    expect(findTeamLeadConflict(users, 'team-1', 'user-1')).toBeNull()
  })

  it('returns null when no lead exists', () => {
    expect(findTeamLeadConflict(users, 'team-2', 'user-2')).toBeNull()
  })
})

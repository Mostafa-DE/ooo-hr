import { describe, expect, it } from 'vitest'

import { canAccessApp, getAccessIssues } from '@/lib/access'
import type { UserProfile } from '@/types/user'

const baseProfile: UserProfile = {
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'User Example',
  photoURL: null,
  isWhitelisted: false,
  role: 'employee',
  teamId: null,
}

describe('canAccessApp', () => {
  it('denies access when profile is missing', () => {
    expect(canAccessApp(null)).toBe(false)
    expect(getAccessIssues(null)).toEqual(['not_whitelisted', 'no_team'])
  })

  it('denies access when not whitelisted', () => {
    expect(canAccessApp(baseProfile)).toBe(false)
    expect(getAccessIssues(baseProfile)).toEqual(['not_whitelisted', 'no_team'])
  })

  it('grants access when whitelisted', () => {
    expect(
      canAccessApp({ ...baseProfile, isWhitelisted: true, teamId: 'team-1' }),
    ).toBe(true)
    expect(
      getAccessIssues({ ...baseProfile, isWhitelisted: true, teamId: 'team-1' }),
    ).toEqual([])
  })

  it('denies access when missing team assignment', () => {
    expect(canAccessApp({ ...baseProfile, isWhitelisted: true })).toBe(false)
    expect(getAccessIssues({ ...baseProfile, isWhitelisted: true })).toEqual([
      'no_team',
    ])
  })

  it('allows admins without a team', () => {
    const adminProfile = {
      ...baseProfile,
      isWhitelisted: true,
      role: 'admin',
      teamId: null,
    }

    expect(canAccessApp(adminProfile)).toBe(true)
    expect(getAccessIssues(adminProfile)).toEqual([])
  })
})

import { describe, expect, it, vi } from 'vitest'

import { ensureUserProfile } from '@/usecases/ensureUserProfile'

describe('ensureUserProfile', () => {
  it('normalizes missing optional fields', async () => {
    const upsertUserOnLogin = vi.fn().mockResolvedValue(undefined)
    const userRepository = { upsertUserOnLogin }

    await ensureUserProfile(
      { userRepository },
      {
        uid: 'user-1',
        email: null,
        displayName: null,
        photoURL: null,
      },
    )

    expect(upsertUserOnLogin).toHaveBeenCalledWith({
      uid: 'user-1',
      email: '',
      displayName: 'Employee',
      photoURL: null,
    })
  })

  it('passes through provided values', async () => {
    const upsertUserOnLogin = vi.fn().mockResolvedValue(undefined)
    const userRepository = { upsertUserOnLogin }

    await ensureUserProfile(
      { userRepository },
      {
        uid: 'user-2',
        email: 'user@example.com',
        displayName: 'User Example',
        photoURL: 'https://example.com/photo.png',
      },
    )

    expect(upsertUserOnLogin).toHaveBeenCalledWith({
      uid: 'user-2',
      email: 'user@example.com',
      displayName: 'User Example',
      photoURL: 'https://example.com/photo.png',
    })
  })
})

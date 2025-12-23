import { describe, expect, it, vi } from 'vitest'

import { setJoinDate } from './setJoinDate'

describe('setJoinDate', () => {
  it('blocks invalid join date values', async () => {
    const userRepository = {
      updateUserJoinDate: vi.fn(),
    }

    await expect(
      setJoinDate(
        { userRepository },
        { uid: 'user-1', joinDate: new Date('invalid') },
      ),
    ).rejects.toThrow('Join date must be a valid date.')
  })

  it('blocks changes once join date is set', async () => {
    const userRepository = {
      updateUserJoinDate: vi.fn(),
    }

    await expect(
      setJoinDate(
        { userRepository },
        {
          uid: 'user-1',
          joinDate: new Date('2025-06-01'),
          currentJoinDate: new Date('2025-05-01'),
        },
      ),
    ).rejects.toThrow('Join date is already set and cannot be changed.')
  })

  it('writes the join date when unset', async () => {
    const updateUserJoinDate = vi.fn()
    const userRepository = {
      updateUserJoinDate,
    }

    const joinDate = new Date('2025-06-01')

    await setJoinDate({ userRepository }, { uid: 'user-1', joinDate })

    expect(updateUserJoinDate).toHaveBeenCalledWith({
      uid: 'user-1',
      joinDate,
    })
  })
})


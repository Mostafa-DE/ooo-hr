import { describe, expect, it, vi } from 'vitest'

import { carryoverLeaveBalance } from '@/usecases/carryoverLeaveBalance'

describe('carryoverLeaveBalance', () => {
  it('blocks carryover without join month', async () => {
    const leaveBalanceRepository = {
      fetchBalance: vi.fn(),
      applyAdjustmentWithLog: vi.fn(),
    }

    await expect(
      carryoverLeaveBalance(
        { leaveBalanceRepository },
        {
          userId: 'user-1',
          leaveTypeId: 'annual',
          fromYear: 2025,
          toYear: 2026,
          actorUid: 'admin-1',
        },
      ),
    ).rejects.toThrow('Join date must be set before adjusting balances.')
  })

  it('does nothing when no source balance exists', async () => {
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue(null),
      applyAdjustmentWithLog: vi.fn(),
    }

    const result = await carryoverLeaveBalance(
      { leaveBalanceRepository },
      {
        userId: 'user-1',
        leaveTypeId: 'annual',
        fromYear: 2025,
        toYear: 2026,
        actorUid: 'admin-1',
        joinDate: new Date('2025-06-01'),
      },
    )

    expect(result).toEqual({ carried: false, balanceMinutes: 0 })
    expect(leaveBalanceRepository.applyAdjustmentWithLog).not.toHaveBeenCalled()
  })

  it('skips when already carried over', async () => {
    const leaveBalanceRepository = {
      fetchBalance: vi
        .fn()
        .mockResolvedValueOnce({ balanceMinutes: 120 })
        .mockResolvedValueOnce({
          balanceMinutes: 200,
          lastCarryoverFromYear: 2025,
        }),
      applyAdjustmentWithLog: vi.fn(),
    }

    const result = await carryoverLeaveBalance(
      { leaveBalanceRepository },
      {
        userId: 'user-1',
        leaveTypeId: 'annual',
        fromYear: 2025,
        toYear: 2026,
        actorUid: 'admin-1',
        joinDate: new Date('2025-06-01'),
      },
    )

    expect(result).toEqual({ carried: false, balanceMinutes: 200 })
    expect(leaveBalanceRepository.applyAdjustmentWithLog).not.toHaveBeenCalled()
  })

  it('carries balance forward and logs the adjustment', async () => {
    const applyAdjustmentWithLog = vi.fn().mockResolvedValue(300)
    const leaveBalanceRepository = {
      fetchBalance: vi
        .fn()
        .mockResolvedValueOnce({ balanceMinutes: 180 })
        .mockResolvedValueOnce({ balanceMinutes: 120 }),
      applyAdjustmentWithLog,
    }

    const result = await carryoverLeaveBalance(
      { leaveBalanceRepository },
      {
        userId: 'user-1',
        leaveTypeId: 'annual',
        fromYear: 2025,
        toYear: 2026,
        actorUid: 'admin-1',
        joinDate: new Date('2025-06-01'),
      },
    )

    expect(applyAdjustmentWithLog).toHaveBeenCalledWith({
      userId: 'user-1',
      leaveTypeId: 'annual',
      year: 2026,
      deltaMinutes: 180,
      reason: 'Yearly carryover from 2025',
      reference: null,
      actorUid: 'admin-1',
      source: 'system',
      lastCarryoverAt: expect.any(Date),
      lastCarryoverFromYear: 2025,
    })
    expect(result).toEqual({ carried: true, balanceMinutes: 300 })
  })
})

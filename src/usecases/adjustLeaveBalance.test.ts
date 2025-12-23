import { describe, expect, it, vi } from 'vitest'

import { adjustLeaveBalance } from './adjustLeaveBalance'

describe('adjustLeaveBalance', () => {
  it('blocks empty reasons', async () => {
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 480 }),
      applyAdjustmentWithLog: vi.fn(),
    }

    await expect(
      adjustLeaveBalance(
        { leaveBalanceRepository },
        {
        userId: 'user-1',
        leaveTypeId: 'annual',
        year: 2025,
        deltaMinutes: 60,
        reason: '   ',
        reference: null,
        actorUid: 'admin-1',
        joinDate: new Date('2025-06-01'),
      },
    ),
    ).rejects.toThrow('Adjustment reason is required.')
  })

  it('blocks zero adjustments', async () => {
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 480 }),
      applyAdjustmentWithLog: vi.fn(),
    }

    await expect(
      adjustLeaveBalance(
        { leaveBalanceRepository },
        {
        userId: 'user-1',
        leaveTypeId: 'annual',
        year: 2025,
        deltaMinutes: 0,
        reason: 'Annual reset',
        reference: null,
        actorUid: 'admin-1',
        joinDate: new Date('2025-06-01'),
      },
    ),
    ).rejects.toThrow('Adjustment must change the balance.')
  })

  it('blocks adjustments without a join date', async () => {
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 480 }),
      applyAdjustmentWithLog: vi.fn(),
    }

    await expect(
      adjustLeaveBalance(
        { leaveBalanceRepository },
        {
          userId: 'user-1',
          leaveTypeId: 'annual',
          year: 2025,
          deltaMinutes: 60,
          reason: 'Adjustment',
          reference: null,
          actorUid: 'admin-1',
        },
      ),
    ).rejects.toThrow('Join date must be set before adjusting balances.')
  })

  it('blocks adjustments that would go negative', async () => {
    const applyAdjustmentWithLog = vi.fn()
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 30 }),
      applyAdjustmentWithLog,
    }

    await expect(
      adjustLeaveBalance(
        { leaveBalanceRepository },
        {
        userId: 'user-1',
        leaveTypeId: 'annual',
        year: 2025,
        deltaMinutes: -60,
        reason: 'Correction',
        reference: null,
        actorUid: 'admin-1',
        joinDate: new Date('2025-06-01'),
      },
    ),
    ).rejects.toThrow(
      'Balance cannot go negative. Record as UNPAID or increase the leave balance.',
    )
    expect(applyAdjustmentWithLog).not.toHaveBeenCalled()
  })

  it('applies a balance adjustment with a log entry', async () => {
    const applyAdjustmentWithLog = vi.fn().mockResolvedValue(480)
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 360 }),
      applyAdjustmentWithLog,
    }

    const result = await adjustLeaveBalance(
      { leaveBalanceRepository },
      {
        userId: 'user-1',
        leaveTypeId: 'annual',
        year: 2025,
        deltaMinutes: 120,
        reason: 'Paid out 2 hours',
        reference: 'PAY-123',
        actorUid: 'admin-1',
        joinDate: new Date('2025-06-01'),
      },
    )

    expect(applyAdjustmentWithLog).toHaveBeenCalledWith({
      userId: 'user-1',
      leaveTypeId: 'annual',
      year: 2025,
      deltaMinutes: 120,
      reason: 'Paid out 2 hours',
      reference: 'PAY-123',
      actorUid: 'admin-1',
      source: 'admin',
    })
    expect(result.balanceMinutes).toBe(480)
  })
})

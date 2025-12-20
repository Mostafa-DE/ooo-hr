import { describe, expect, it, vi } from 'vitest'

import { adjustLeaveBalance } from '@/usecases/adjustLeaveBalance'

describe('adjustLeaveBalance', () => {
  it('blocks empty reasons', async () => {
    const leaveBalanceRepository = {
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
        },
      ),
    ).rejects.toThrow('Adjustment reason is required.')
  })

  it('blocks zero adjustments', async () => {
    const leaveBalanceRepository = {
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
        },
      ),
    ).rejects.toThrow('Adjustment must change the balance.')
  })

  it('applies a balance adjustment with a log entry', async () => {
    const applyAdjustmentWithLog = vi.fn().mockResolvedValue(480)
    const leaveBalanceRepository = {
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

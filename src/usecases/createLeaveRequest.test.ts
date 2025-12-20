import { describe, expect, it, vi } from 'vitest'

import { createLeaveRequest } from '@/usecases/createLeaveRequest'
import type { LeaveRequest } from '@/types/leave'

describe('createLeaveRequest', () => {
  it('blocks invalid time ranges', async () => {
    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue([]),
      createLeaveRequest: vi.fn(),
      approveAsTeamLeadWithBalance: vi.fn(),
    }
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 120 }),
    }

    await expect(
      createLeaveRequest(
        { leaveRequestRepository, leaveBalanceRepository },
        {
          employeeUid: 'user-1',
          teamId: 'team-1',
          teamLeadUid: 'lead-1',
          managerUid: 'manager-1',
          type: 'annual',
          startAt: new Date('2024-01-02T10:00:00Z'),
          endAt: new Date('2024-01-02T09:00:00Z'),
          note: null,
        },
      ),
    ).rejects.toThrow('End time must be after start time.')
  })

  it('blocks requests outside working days', async () => {
    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue([]),
      createLeaveRequest: vi.fn(),
      approveAsTeamLeadWithBalance: vi.fn(),
    }
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 480 }),
    }

    await expect(
      createLeaveRequest(
        { leaveRequestRepository, leaveBalanceRepository },
        {
          employeeUid: 'user-1',
          teamId: 'team-1',
          teamLeadUid: 'lead-1',
          managerUid: 'manager-1',
          type: 'annual',
          startAt: new Date('2025-12-20T09:00:00+03:00'),
          endAt: new Date('2025-12-21T17:00:00+03:00'),
          note: null,
        },
      ),
    ).rejects.toThrow('Start and end dates must be on working days (Sun–Thu).')
  })

  it('blocks overlaps with submitted requests', async () => {
    const existing: LeaveRequest[] = [
      {
        id: 'req-1',
        employeeUid: 'user-1',
        teamId: 'team-1',
        type: 'annual',
        startAt: new Date('2024-01-02T10:00:00Z'),
        endAt: new Date('2024-01-02T12:00:00Z'),
        requestedMinutes: 120,
        status: 'SUBMITTED',
        note: null,
      },
    ]

    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue(existing),
      createLeaveRequest: vi.fn(),
      approveAsTeamLeadWithBalance: vi.fn(),
    }
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 480 }),
    }

    await expect(
      createLeaveRequest(
        { leaveRequestRepository, leaveBalanceRepository },
        {
          employeeUid: 'user-1',
          teamId: 'team-1',
          teamLeadUid: 'lead-1',
          managerUid: 'manager-1',
          type: 'annual',
          startAt: new Date('2024-01-02T11:00:00Z'),
          endAt: new Date('2024-01-02T13:00:00Z'),
          note: null,
        },
      ),
    ).rejects.toThrow('This request overlaps with an existing leave request.')
  })

  it('blocks overlaps with approved requests', async () => {
    const existing: LeaveRequest[] = [
      {
        id: 'req-1',
        employeeUid: 'user-1',
        teamId: 'team-1',
        type: 'annual',
        startAt: new Date('2024-01-02T10:00:00Z'),
        endAt: new Date('2024-01-02T12:00:00Z'),
        requestedMinutes: 120,
        status: 'APPROVED',
        note: null,
      },
    ]

    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue(existing),
      createLeaveRequest: vi.fn(),
      approveAsTeamLeadWithBalance: vi.fn(),
    }
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 480 }),
    }

    await expect(
      createLeaveRequest(
        { leaveRequestRepository, leaveBalanceRepository },
        {
          employeeUid: 'user-1',
          teamId: 'team-1',
          teamLeadUid: 'lead-1',
          managerUid: 'manager-1',
          type: 'annual',
          startAt: new Date('2024-01-02T11:00:00Z'),
          endAt: new Date('2024-01-02T13:00:00Z'),
          note: null,
        },
      ),
    ).rejects.toThrow('This request overlaps with an existing leave request.')
  })

  it('creates a request when no overlap exists', async () => {
    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue([]),
      createLeaveRequest: vi.fn().mockResolvedValue('req-1'),
      approveAsTeamLeadWithBalance: vi.fn(),
    }
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 120 }),
    }

    const result = await createLeaveRequest(
      { leaveRequestRepository, leaveBalanceRepository },
      {
        employeeUid: 'user-1',
        teamId: 'team-1',
        teamLeadUid: 'lead-1',
        managerUid: 'manager-1',
        type: 'annual',
        startAt: new Date('2024-01-02T10:00:00Z'),
        endAt: new Date('2024-01-02T11:00:00Z'),
        note: null,
      },
    )

    expect(result.requestedMinutes).toBe(60)
    expect(leaveRequestRepository.createLeaveRequest).toHaveBeenCalledWith({
      employeeUid: 'user-1',
      teamId: 'team-1',
      type: 'annual',
      startAt: new Date('2024-01-02T10:00:00Z'),
      endAt: new Date('2024-01-02T11:00:00Z'),
      year: 2024,
      requestedMinutes: 60,
      durationMinutes: 60,
      note: null,
    })
  })

  it('auto-approves when the requester is team lead and no manager exists', async () => {
    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue([]),
      createLeaveRequest: vi.fn().mockResolvedValue('req-2'),
      approveAsTeamLeadWithBalance: vi.fn().mockResolvedValue(undefined),
    }
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 120 }),
    }

    await createLeaveRequest(
      { leaveRequestRepository, leaveBalanceRepository },
      {
        employeeUid: 'lead-1',
        teamId: 'team-1',
        teamLeadUid: 'lead-1',
        managerUid: null,
        type: 'annual',
        startAt: new Date('2024-01-02T10:00:00Z'),
        endAt: new Date('2024-01-02T11:00:00Z'),
        note: null,
      },
    )

    expect(leaveRequestRepository.approveAsTeamLeadWithBalance).toHaveBeenCalledWith({
      requestId: 'req-2',
      actorUid: 'lead-1',
      leaveTypeId: 'annual',
      year: 2024,
      durationMinutes: 60,
    })
  })

  it('blocks submissions when balance is insufficient', async () => {
    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue([]),
      createLeaveRequest: vi.fn(),
      approveAsTeamLeadWithBalance: vi.fn(),
    }
    const leaveBalanceRepository = {
      fetchBalance: vi.fn().mockResolvedValue({ balanceMinutes: 30 }),
    }

    await expect(
      createLeaveRequest(
        { leaveRequestRepository, leaveBalanceRepository },
        {
          employeeUid: 'user-1',
          teamId: 'team-1',
          teamLeadUid: 'lead-1',
          managerUid: 'manager-1',
          type: 'annual',
          startAt: new Date('2024-01-02T10:00:00Z'),
          endAt: new Date('2024-01-02T11:00:00Z'),
          note: null,
        },
      ),
    ).rejects.toThrow('Insufficient leave balance.')
  })
})

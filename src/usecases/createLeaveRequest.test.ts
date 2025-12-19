import { describe, expect, it, vi } from 'vitest'

import { createLeaveRequest } from '@/usecases/createLeaveRequest'
import type { LeaveRequest } from '@/types/leave'

describe('createLeaveRequest', () => {
  it('blocks invalid time ranges', async () => {
    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue([]),
      createLeaveRequest: vi.fn(),
      autoApproveRequest: vi.fn(),
    }

    await expect(
      createLeaveRequest(
        { leaveRequestRepository },
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
      autoApproveRequest: vi.fn(),
    }

    await expect(
      createLeaveRequest(
        { leaveRequestRepository },
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
      autoApproveRequest: vi.fn(),
    }

    const result = await createLeaveRequest(
      { leaveRequestRepository },
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
    expect(leaveRequestRepository.createLeaveRequest).toHaveBeenCalledTimes(1)
  })

  it('auto-approves when the requester is team lead and no manager exists', async () => {
    const leaveRequestRepository = {
      fetchUserRequests: vi.fn().mockResolvedValue([]),
      createLeaveRequest: vi.fn().mockResolvedValue('req-2'),
      autoApproveRequest: vi.fn().mockResolvedValue(undefined),
    }

    await createLeaveRequest(
      { leaveRequestRepository },
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

    expect(leaveRequestRepository.autoApproveRequest).toHaveBeenCalledWith({
      requestId: 'req-2',
      actorUid: 'lead-1',
    })
  })
})

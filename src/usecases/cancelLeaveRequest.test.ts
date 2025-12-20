import { describe, expect, it, vi } from 'vitest'

import { cancelLeaveRequest } from '@/usecases/cancelLeaveRequest'
import type { LeaveRequest } from '@/types/leave'

describe('cancelLeaveRequest', () => {
  const request: LeaveRequest = {
    id: 'req-1',
    employeeUid: 'user-1',
    teamId: 'team-1',
    type: 'annual',
    startAt: new Date('2024-01-02T10:00:00Z'),
    endAt: new Date('2024-01-02T12:00:00Z'),
    requestedMinutes: 120,
    status: 'SUBMITTED',
    note: null,
  }

  it('allows cancelling when not approved', async () => {
    const cancelLeaveRequestRepo = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      cancelLeaveRequest: cancelLeaveRequestRepo,
    }

    await cancelLeaveRequest(
      { leaveRequestRepository },
      { request, actorUid: 'user-1', actorRole: 'employee', reason: null },
    )

    expect(cancelLeaveRequestRepo).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'user-1',
      reason: null,
    })
  })

  it('blocks non-admin from cancelling approved requests', async () => {
    const cancelLeaveRequestRepo = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      cancelLeaveRequest: cancelLeaveRequestRepo,
    }

    await expect(
      cancelLeaveRequest(
        { leaveRequestRepository },
        {
          request: { ...request, status: 'APPROVED' },
          actorUid: 'user-1',
          actorRole: 'employee',
          reason: null,
        },
      ),
    ).rejects.toThrow('Approved requests can only be cancelled by an admin.')
  })

  it('allows admin to cancel approved requests', async () => {
    const cancelLeaveRequestRepo = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      cancelLeaveRequest: cancelLeaveRequestRepo,
    }

    await cancelLeaveRequest(
      { leaveRequestRepository },
      {
        request: { ...request, status: 'APPROVED' },
        actorUid: 'admin-1',
        actorRole: 'admin',
        reason: 'Cancelled by admin',
      },
    )

    expect(cancelLeaveRequestRepo).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'admin-1',
      reason: 'Cancelled by admin',
    })
  })
})

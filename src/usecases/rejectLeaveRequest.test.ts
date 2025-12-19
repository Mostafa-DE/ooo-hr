import { describe, expect, it, vi } from 'vitest'

import { rejectLeaveRequest } from '@/usecases/rejectLeaveRequest'
import type { LeaveRequest } from '@/types/leave'
import type { Team } from '@/types/team'

describe('rejectLeaveRequest', () => {
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

  const baseTeam: Team = {
    id: 'team-1',
    name: 'Design',
    leadUid: 'lead-1',
    managerUid: 'manager-1',
  }

  it('allows team lead to reject submitted requests', async () => {
    const rejectAsTeamLead = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      rejectAsTeamLead,
      rejectAsManager: vi.fn(),
    }

    await rejectLeaveRequest(
      { leaveRequestRepository },
      { request, team: baseTeam, actorUid: 'lead-1', reason: 'No coverage' },
    )

    expect(rejectAsTeamLead).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'lead-1',
      reason: 'No coverage',
    })
  })

  it('allows manager to reject TL-approved requests', async () => {
    const rejectAsManager = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      rejectAsTeamLead: vi.fn(),
      rejectAsManager,
    }

    await rejectLeaveRequest(
      { leaveRequestRepository },
      {
        request: { ...request, status: 'TL_APPROVED' },
        team: baseTeam,
        actorUid: 'manager-1',
        reason: null,
      },
    )

    expect(rejectAsManager).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'manager-1',
      reason: null,
    })
  })

  it('blocks team lead from rejecting their own request', async () => {
    const leaveRequestRepository = {
      rejectAsTeamLead: vi.fn(),
      rejectAsManager: vi.fn(),
    }

    await expect(
      rejectLeaveRequest(
        { leaveRequestRepository },
        {
          request: { ...request, employeeUid: 'lead-1' },
          team: baseTeam,
          actorUid: 'lead-1',
          reason: 'Not possible',
        },
      ),
    ).rejects.toThrow('Team lead cannot reject their own request.')
  })
})

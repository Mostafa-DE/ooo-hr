import { describe, expect, it, vi } from 'vitest'

import { approveLeaveRequest } from '@/usecases/approveLeaveRequest'
import type { LeaveRequest } from '@/types/leave'
import type { Team } from '@/types/team'

describe('approveLeaveRequest', () => {
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

  it('allows team lead to approve submitted requests', async () => {
    const approveAsTeamLead = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      approveAsTeamLead,
      approveAsManager: vi.fn(),
    }

    await approveLeaveRequest(
      { leaveRequestRepository },
      { request, team: baseTeam, actorUid: 'lead-1', actorRole: 'team_lead' },
    )

    expect(approveAsTeamLead).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'lead-1',
      autoApprove: false,
    })
  })

  it('auto-approves when no manager exists', async () => {
    const approveAsTeamLead = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      approveAsTeamLead,
      approveAsManager: vi.fn(),
    }

    await approveLeaveRequest(
      { leaveRequestRepository },
      {
        request,
        team: { ...baseTeam, managerUid: null },
        actorUid: 'lead-1',
        actorRole: 'team_lead',
      },
    )

    expect(approveAsTeamLead).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'lead-1',
      autoApprove: true,
    })
  })

  it('allows manager to approve TL-approved requests', async () => {
    const approveAsManager = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      approveAsTeamLead: vi.fn(),
      approveAsManager,
    }

    await approveLeaveRequest(
      { leaveRequestRepository },
      {
        request: { ...request, status: 'TL_APPROVED' },
        team: baseTeam,
        actorUid: 'manager-1',
        actorRole: 'manager',
      },
    )

    expect(approveAsManager).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'manager-1',
      direct: false,
    })
  })

  it('allows manager to approve team lead requests directly', async () => {
    const approveAsManager = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      approveAsTeamLead: vi.fn(),
      approveAsManager,
    }

    await approveLeaveRequest(
      { leaveRequestRepository },
      {
        request: { ...request, employeeUid: 'lead-1' },
        team: baseTeam,
        actorUid: 'manager-1',
        actorRole: 'manager',
      },
    )

    expect(approveAsManager).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'manager-1',
      direct: true,
    })
  })

  it('blocks team lead from approving their own request', async () => {
    const leaveRequestRepository = {
      approveAsTeamLead: vi.fn(),
      approveAsManager: vi.fn(),
    }

    await expect(
      approveLeaveRequest(
        { leaveRequestRepository },
        {
          request: { ...request, employeeUid: 'lead-1' },
          team: baseTeam,
          actorUid: 'lead-1',
          actorRole: 'team_lead',
        },
      ),
    ).rejects.toThrow('Team lead cannot approve their own request.')
  })

  it('allows admin to approve submitted requests directly', async () => {
    const approveAsManager = vi.fn().mockResolvedValue(undefined)
    const leaveRequestRepository = {
      approveAsTeamLead: vi.fn(),
      approveAsManager,
    }

    await approveLeaveRequest(
      { leaveRequestRepository },
      {
        request,
        team: null,
        actorUid: 'admin-1',
        actorRole: 'admin',
      },
    )

    expect(approveAsManager).toHaveBeenCalledWith({
      requestId: 'req-1',
      actorUid: 'admin-1',
      direct: true,
    })
  })
})

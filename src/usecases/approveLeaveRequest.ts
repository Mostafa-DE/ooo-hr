import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { Team } from '@/types/team'
import type { LeaveRequest } from '@/types/leave'

type ApproveLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
}

type ApproveLeaveRequestInput = {
  request: LeaveRequest
  team: Team
  actorUid: string
}

export async function approveLeaveRequest(
  context: ApproveLeaveRequestContext,
  input: ApproveLeaveRequestInput,
) {
  const { request, team, actorUid } = input

  const isTeamLead = team.leadUid === actorUid
  const isManager = team.managerUid === actorUid

  if (isTeamLead && request.status === 'SUBMITTED') {
    if (request.employeeUid === team.leadUid) {
      throw new Error('Team lead cannot approve their own request.')
    }

    await context.leaveRequestRepository.approveAsTeamLead({
      requestId: request.id,
      actorUid,
      autoApprove: !team.managerUid,
    })
    return
  }

  if (isManager) {
    if (request.status === 'TL_APPROVED') {
      await context.leaveRequestRepository.approveAsManager({
        requestId: request.id,
        actorUid,
        direct: false,
      })
      return
    }

    if (request.status === 'SUBMITTED' && request.employeeUid === team.leadUid) {
      await context.leaveRequestRepository.approveAsManager({
        requestId: request.id,
        actorUid,
        direct: true,
      })
      return
    }
  }

  throw new Error('You are not allowed to approve this request.')
}

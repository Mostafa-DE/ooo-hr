import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { LeaveRequest } from '@/types/leave'
import type { Team } from '@/types/team'

type RejectLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
}

type RejectLeaveRequestInput = {
  request: LeaveRequest
  team: Team
  actorUid: string
  reason: string | null
}

export async function rejectLeaveRequest(
  context: RejectLeaveRequestContext,
  input: RejectLeaveRequestInput,
) {
  const { request, team, actorUid, reason } = input

  const isTeamLead = team.leadUid === actorUid
  const isManager = team.managerUid === actorUid

  if (isTeamLead && request.status === 'SUBMITTED') {
    if (request.employeeUid === team.leadUid) {
      throw new Error('Team lead cannot reject their own request.')
    }

    await context.leaveRequestRepository.rejectAsTeamLead({
      requestId: request.id,
      actorUid,
      reason,
    })
    return
  }

  if (isManager) {
    const managerDirect =
      request.status === 'TL_APPROVED' ||
      (request.status === 'SUBMITTED' && request.employeeUid === team.leadUid)

    if (managerDirect) {
      await context.leaveRequestRepository.rejectAsManager({
        requestId: request.id,
        actorUid,
        reason,
      })
      return
    }
  }

  throw new Error('You are not allowed to reject this request.')
}

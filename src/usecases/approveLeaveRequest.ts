import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { Team } from '@/types/team'
import type { LeaveRequest } from '@/types/leave'
import type { UserRole } from '@/types/user'

type ApproveLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
}

type ApproveLeaveRequestInput = {
  request: LeaveRequest
  team: Team | null
  actorUid: string
  actorRole: UserRole
}

export async function approveLeaveRequest(
  context: ApproveLeaveRequestContext,
  input: ApproveLeaveRequestInput,
) {
  const { request, team, actorUid, actorRole } = input

  if (actorRole === 'admin') {
    if (request.status === 'SUBMITTED') {
      await context.leaveRequestRepository.approveAsManager({
        requestId: request.id,
        actorUid,
        direct: true,
      })
      return
    }

    if (request.status === 'TL_APPROVED') {
      await context.leaveRequestRepository.approveAsManager({
        requestId: request.id,
        actorUid,
        direct: false,
      })
      return
    }

    throw new Error('You are not allowed to approve this request.')
  }

  if (!team) {
    throw new Error('Team context is required to approve this request.')
  }

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

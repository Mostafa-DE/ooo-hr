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
  const durationMinutes = request.durationMinutes ?? request.requestedMinutes
  const requestYear = request.year ?? request.startAt.getFullYear()

  if (actorRole === 'admin') {
    if (request.status === 'SUBMITTED') {
      await context.leaveRequestRepository.approveAsManagerWithBalance({
        requestId: request.id,
        actorUid,
        direct: true,
        leaveTypeId: request.type,
        year: requestYear,
        durationMinutes,
      })
      return
    }

    if (request.status === 'TL_APPROVED') {
      await context.leaveRequestRepository.approveAsManagerWithBalance({
        requestId: request.id,
        actorUid,
        direct: false,
        leaveTypeId: request.type,
        year: requestYear,
        durationMinutes,
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

    if (!team.managerUid) {
      await context.leaveRequestRepository.approveAsTeamLeadWithBalance({
        requestId: request.id,
        actorUid,
        leaveTypeId: request.type,
        year: requestYear,
        durationMinutes,
      })
    } else {
      await context.leaveRequestRepository.approveAsTeamLead({
        requestId: request.id,
        actorUid,
        autoApprove: false,
      })
    }
    return
  }

  if (isManager) {
    if (request.status === 'TL_APPROVED') {
      await context.leaveRequestRepository.approveAsManagerWithBalance({
        requestId: request.id,
        actorUid,
        direct: false,
        leaveTypeId: request.type,
        year: requestYear,
        durationMinutes,
      })
      return
    }

    if (request.status === 'SUBMITTED' && request.employeeUid === team.leadUid) {
      await context.leaveRequestRepository.approveAsManagerWithBalance({
        requestId: request.id,
        actorUid,
        direct: true,
        leaveTypeId: request.type,
        year: requestYear,
        durationMinutes,
      })
      return
    }
  }

  throw new Error('You are not allowed to approve this request.')
}

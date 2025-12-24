import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { UserRepository } from '@/lib/userRepository'
import type { TeamRepository } from '@/lib/teamRepository'
import type { LeaveRequest } from '@/types/leave'
import type { Team } from '@/types/team'
import { emailService } from '@/lib/emailService'
import { fetchEmployeeRecipient, formatRequestDates } from '@/lib/emailHelpers'

type RejectLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
  userRepository: UserRepository
  teamRepository: TeamRepository
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

    // Send rejection notification
    if (emailService.isEnabled()) {
      sendRejectionNotification({
        request,
        actorUid,
        reason,
        context,
        approverRole: 'Team Lead',
      }).catch((error) => console.error('[rejectLeaveRequest] Email failed:', error))
    }
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

      // Send rejection notification
      if (emailService.isEnabled()) {
        sendRejectionNotification({
          request,
          actorUid,
          reason,
          context,
          approverRole: 'Manager',
        }).catch((error) => console.error('[rejectLeaveRequest] Email failed:', error))
      }
      return
    }
  }

  throw new Error('You are not allowed to reject this request.')
}

async function sendRejectionNotification(params: {
  request: LeaveRequest
  actorUid: string
  reason: string | null
  context: RejectLeaveRequestContext
  approverRole: 'Team Lead' | 'Manager'
}) {
  try {
    const employee = await fetchEmployeeRecipient(
      { userRepository: params.context.userRepository, teamRepository: params.context.teamRepository },
      params.request.employeeUid,
    )

    const approver = await fetchEmployeeRecipient(
      { userRepository: params.context.userRepository, teamRepository: params.context.teamRepository },
      params.actorUid,
    )

    if (!employee || !approver) {
      return
    }

    const dates = formatRequestDates(params.request)

    await emailService.sendNotification({
      type: 'REQUEST_REJECTED',
      requestId: params.request.id,
      employeeEmail: employee.email,
      employeeName: employee.name,
      leaveType: params.request.type,
      ...dates,
      note: params.request.note,
      approverName: approver.name,
      approverRole: params.approverRole,
      rejectionReason: params.reason,
      recipients: [employee],
    })
  } catch (error) {
    console.error('[rejectLeaveRequest] Rejection notification error:', error)
  }
}

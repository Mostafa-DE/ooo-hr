import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { UserRepository } from '@/lib/userRepository'
import type { TeamRepository } from '@/lib/teamRepository'
import type { Team } from '@/types/team'
import type { LeaveRequest } from '@/types/leave'
import type { UserRole } from '@/types/user'
import { emailService } from '@/lib/emailService'
import { fetchEmployeeRecipient, fetchApproverRecipients, formatRequestDates } from '@/lib/emailHelpers'

type ApproveLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
  userRepository: UserRepository
  teamRepository: TeamRepository
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

      // Send final approval notification to employee
      if (emailService.isEnabled()) {
        sendFinalApprovalNotification({
          request,
          actorUid,
          context,
          approverRole: 'Team Lead',
        }).catch((error) => console.error('[approveLeaveRequest] Email failed:', error))
      }
    } else {
      await context.leaveRequestRepository.approveAsTeamLead({
        requestId: request.id,
        actorUid,
        autoApprove: false,
      })

      // Send notification to manager
      if (emailService.isEnabled()) {
        sendTLApprovedWithManagerNotification({
          request,
          actorUid,
          context,
        }).catch((error) => console.error('[approveLeaveRequest] Email failed:', error))
      }
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

      // Send final approval notification to employee
      if (emailService.isEnabled()) {
        sendFinalApprovalNotification({
          request,
          actorUid,
          context,
          approverRole: 'Manager',
        }).catch((error) => console.error('[approveLeaveRequest] Email failed:', error))
      }
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

      // Send final approval notification to employee
      if (emailService.isEnabled()) {
        sendFinalApprovalNotification({
          request,
          actorUid,
          context,
          approverRole: 'Manager',
        }).catch((error) => console.error('[approveLeaveRequest] Email failed:', error))
      }
      return
    }
  }

  throw new Error('You are not allowed to approve this request.')
}

async function sendFinalApprovalNotification(params: {
  request: LeaveRequest
  actorUid: string
  context: ApproveLeaveRequestContext
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

    const notificationType = params.approverRole === 'Manager'
      ? 'MANAGER_APPROVED_FINAL'
      : 'TL_APPROVED_FINAL'

    await emailService.sendNotification({
      type: notificationType,
      requestId: params.request.id,
      employeeEmail: employee.email,
      employeeName: employee.name,
      leaveType: params.request.type,
      ...dates,
      note: params.request.note,
      approverName: approver.name,
      approverRole: params.approverRole,
      recipients: [employee],
    })
  } catch (error) {
    console.error('[approveLeaveRequest] Final approval notification error:', error)
  }
}

async function sendTLApprovedWithManagerNotification(params: {
  request: LeaveRequest
  actorUid: string
  context: ApproveLeaveRequestContext
}) {
  try {
    const { manager } = await fetchApproverRecipients(
      { userRepository: params.context.userRepository, teamRepository: params.context.teamRepository },
      params.request.teamId,
    )

    const employee = await fetchEmployeeRecipient(
      { userRepository: params.context.userRepository, teamRepository: params.context.teamRepository },
      params.request.employeeUid,
    )

    const teamLead = await fetchEmployeeRecipient(
      { userRepository: params.context.userRepository, teamRepository: params.context.teamRepository },
      params.actorUid,
    )

    if (!manager || !employee) {
      return
    }

    const dates = formatRequestDates(params.request)

    await emailService.sendNotification({
      type: 'TL_APPROVED_WITH_MANAGER',
      requestId: params.request.id,
      employeeEmail: employee.email,
      employeeName: employee.name,
      leaveType: params.request.type,
      ...dates,
      note: params.request.note,
      approverName: teamLead?.name,
      teamLeadApprovalDate: new Date().toLocaleDateString(),
      recipients: [manager],
    })
  } catch (error) {
    console.error('[approveLeaveRequest] TL approved notification error:', error)
  }
}

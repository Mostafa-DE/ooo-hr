import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { LeaveBalanceRepository } from '@/lib/leaveBalanceRepository'
import type { UserRepository } from '@/lib/userRepository'
import type { TeamRepository } from '@/lib/teamRepository'
import { computeWorkingMinutes, hasOverlap, isWorkingDay, formatDateTime, formatDurationWithDays } from '@/lib/leave'
import type { LeaveType } from '@/types/leave'
import { emailService } from '@/lib/emailService'
import { fetchApproverRecipients, fetchEmployeeRecipient } from '@/lib/emailHelpers'
import type { EmailRecipient } from '@/types/email'

type CreateLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
  leaveBalanceRepository: LeaveBalanceRepository
  userRepository: UserRepository
  teamRepository: TeamRepository
}

type CreateLeaveRequestInput = {
  employeeUid: string
  teamId: string
  teamLeadUid: string | null
  managerUid: string | null
  type: LeaveType
  startAt: Date
  endAt: Date
  note: string | null
}

export async function createLeaveRequest(
  context: CreateLeaveRequestContext,
  input: CreateLeaveRequestInput,
) {
  if (input.endAt <= input.startAt) {
    throw new Error('End time must be after start time.')
  }

  if (!isWorkingDay(input.startAt) || !isWorkingDay(input.endAt)) {
    throw new Error('Start and end dates must be on working days (Sun–Thu).')
  }

  const requestedMinutes = computeWorkingMinutes(input.startAt, input.endAt)

  if (requestedMinutes <= 0) {
    throw new Error('Duration must be greater than zero.')
  }

  const year = input.startAt.getFullYear()

  const balance = await context.leaveBalanceRepository.fetchBalance(
    input.employeeUid,
    input.type,
    year,
  )

  if (!balance || balance.balanceMinutes < requestedMinutes) {
    throw new Error('Insufficient leave balance.')
  }

  const existing = await context.leaveRequestRepository.fetchUserRequests(
    input.employeeUid,
  )
  const activeRequests = existing.filter((request) =>
    request.status === 'SUBMITTED' ||
    request.status === 'TL_APPROVED' ||
    request.status === 'APPROVED',
  )

  if (hasOverlap(activeRequests, input.startAt, input.endAt)) {
    throw new Error('This request overlaps with an existing leave request.')
  }

  const requestId = await context.leaveRequestRepository.createLeaveRequest({
    employeeUid: input.employeeUid,
    teamId: input.teamId,
    type: input.type,
    startAt: input.startAt,
    endAt: input.endAt,
    year,
    requestedMinutes,
    durationMinutes: requestedMinutes,
    note: input.note,
  })

  // Send email notification (don't await - fire and forget)
  if (emailService.isEnabled()) {
    sendRequestCreatedNotification({
      requestId,
      request: input,
      requestedMinutes,
      context,
    }).catch((error) => {
      console.error('[createLeaveRequest] Failed to send email:', error)
    })
  }

  if (input.teamLeadUid === input.employeeUid && !input.managerUid) {
    await context.leaveRequestRepository.approveAsTeamLeadWithBalance({
      requestId,
      actorUid: input.employeeUid,
      leaveTypeId: input.type,
      year,
      durationMinutes: requestedMinutes,
    })
  }

  return { requestedMinutes }
}

async function sendRequestCreatedNotification(params: {
  requestId: string
  request: CreateLeaveRequestInput
  requestedMinutes: number
  context: CreateLeaveRequestContext
}) {
  try {
    const { teamLead, manager } = await fetchApproverRecipients(
      { userRepository: params.context.userRepository, teamRepository: params.context.teamRepository },
      params.request.teamId,
    )

    const employee = await fetchEmployeeRecipient(
      { userRepository: params.context.userRepository, teamRepository: params.context.teamRepository },
      params.request.employeeUid,
    )

    if (!employee) {
      console.warn('[createLeaveRequest] Cannot send notification: employee email not found')
      return
    }

    const recipients = [teamLead, manager].filter((r): r is EmailRecipient => r !== null)

    if (recipients.length === 0) {
      console.warn('[createLeaveRequest] No approvers to notify')
      return
    }

    console.log('====================================');
    console.log("sending email to", recipients);
    console.log('====================================');

    await emailService.sendNotification({
      type: 'REQUEST_CREATED',
      requestId: params.requestId,
      employeeEmail: employee.email,
      employeeName: employee.name,
      leaveType: params.request.type,
      startDate: formatDateTime(params.request.startAt),
      endDate: formatDateTime(params.request.endAt),
      duration: formatDurationWithDays(params.requestedMinutes),
      note: params.request.note,
      recipients,
    })
  } catch (error) {
    console.error('[createLeaveRequest] Notification error:', error)
  }
}

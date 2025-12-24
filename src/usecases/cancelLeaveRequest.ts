import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { UserRepository } from '@/lib/userRepository'
import type { TeamRepository } from '@/lib/teamRepository'
import type { LeaveRequest } from '@/types/leave'
import type { UserRole } from '@/types/user'
import { emailService } from '@/lib/emailService'
import { fetchEmployeeRecipient, formatRequestDates } from '@/lib/emailHelpers'

type CancelLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
  userRepository: UserRepository
  teamRepository: TeamRepository
}

type CancelLeaveRequestInput = {
  request: LeaveRequest
  actorUid: string
  actorRole: UserRole
  reason?: string | null
}

export async function cancelLeaveRequest(
  context: CancelLeaveRequestContext,
  input: CancelLeaveRequestInput,
) {
  if (input.request.status === 'APPROVED' && input.actorRole !== 'admin') {
    throw new Error('Approved requests can only be cancelled by an admin.')
  }

  if (input.request.status === 'APPROVED') {
    const durationMinutes =
      input.request.durationMinutes ?? input.request.requestedMinutes
    const requestYear = input.request.year ?? input.request.startAt.getFullYear()

    await context.leaveRequestRepository.cancelApprovedWithBalance({
      requestId: input.request.id,
      actorUid: input.actorUid,
      leaveTypeId: input.request.type,
      year: requestYear,
      durationMinutes,
      reason: input.reason ?? null,
    })

    // Send cancellation notification
    if (emailService.isEnabled()) {
      sendCancellationNotification({
        request: input.request,
        reason: input.reason ?? null,
        context,
      }).catch((error) => console.error('[cancelLeaveRequest] Email failed:', error))
    }
    return
  }

  await context.leaveRequestRepository.cancelLeaveRequest({
    requestId: input.request.id,
    actorUid: input.actorUid,
    reason: input.reason,
  })

  // Send cancellation notification
  if (emailService.isEnabled()) {
    sendCancellationNotification({
      request: input.request,
      reason: input.reason ?? null,
      context,
    }).catch((error) => console.error('[cancelLeaveRequest] Email failed:', error))
  }
}

async function sendCancellationNotification(params: {
  request: LeaveRequest
  reason: string | null
  context: CancelLeaveRequestContext
}) {
  try {
    const employee = await fetchEmployeeRecipient(
      { userRepository: params.context.userRepository, teamRepository: params.context.teamRepository },
      params.request.employeeUid,
    )

    if (!employee) {
      return
    }

    const dates = formatRequestDates(params.request)

    await emailService.sendNotification({
      type: 'REQUEST_CANCELLED',
      requestId: params.request.id,
      employeeEmail: employee.email,
      employeeName: employee.name,
      leaveType: params.request.type,
      ...dates,
      note: params.request.note,
      rejectionReason: params.reason,
      recipients: [employee],
    })
  } catch (error) {
    console.error('[cancelLeaveRequest] Cancellation notification error:', error)
  }
}

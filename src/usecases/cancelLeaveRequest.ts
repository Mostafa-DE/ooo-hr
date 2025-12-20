import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { LeaveRequest } from '@/types/leave'
import type { UserRole } from '@/types/user'

type CancelLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
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
    return
  }

  await context.leaveRequestRepository.cancelLeaveRequest({
    requestId: input.request.id,
    actorUid: input.actorUid,
    reason: input.reason,
  })
}

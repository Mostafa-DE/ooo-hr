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

  await context.leaveRequestRepository.cancelLeaveRequest({
    requestId: input.request.id,
    actorUid: input.actorUid,
    reason: input.reason,
  })
}

import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'

type CancelLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
}

type CancelLeaveRequestInput = {
  requestId: string
  actorUid: string
  reason?: string | null
}

export async function cancelLeaveRequest(
  context: CancelLeaveRequestContext,
  input: CancelLeaveRequestInput,
) {
  await context.leaveRequestRepository.cancelLeaveRequest(input)
}

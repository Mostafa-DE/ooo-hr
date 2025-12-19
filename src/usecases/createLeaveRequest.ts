import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import { computeMinutes, hasOverlap } from '@/lib/leave'
import type { LeaveType } from '@/types/leave'

type CreateLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
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

  const requestedMinutes = computeMinutes(input.startAt, input.endAt)

  if (requestedMinutes <= 0) {
    throw new Error('Duration must be greater than zero.')
  }

  const existing = await context.leaveRequestRepository.fetchUserRequests(
    input.employeeUid,
  )
  const activeRequests = existing.filter((request) => request.status === 'SUBMITTED')

  if (hasOverlap(activeRequests, input.startAt, input.endAt)) {
    throw new Error('This request overlaps with an existing leave request.')
  }

  const requestId = await context.leaveRequestRepository.createLeaveRequest({
    employeeUid: input.employeeUid,
    teamId: input.teamId,
    type: input.type,
    startAt: input.startAt,
    endAt: input.endAt,
    requestedMinutes,
    note: input.note,
  })

  if (input.teamLeadUid === input.employeeUid && !input.managerUid) {
    await context.leaveRequestRepository.autoApproveRequest({
      requestId,
      actorUid: input.employeeUid,
    })
  }

  return { requestedMinutes }
}

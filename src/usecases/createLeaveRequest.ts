import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { LeaveBalanceRepository } from '@/lib/leaveBalanceRepository'
import { computeWorkingMinutes, hasOverlap, isWorkingDay } from '@/lib/leave'
import type { LeaveType } from '@/types/leave'

type CreateLeaveRequestContext = {
  leaveRequestRepository: LeaveRequestRepository
  leaveBalanceRepository: LeaveBalanceRepository
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

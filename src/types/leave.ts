export type LeaveType = 'annual' | 'sick' | 'unpaid' | 'other'

export type LeaveStatus =
  | 'SUBMITTED'
  | 'TL_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export type LeaveApprovalStep = {
  byUid: string
  at: Date
}

export type LeaveRejection = {
  byUid: string
  at: Date
  reason: string | null
}

export type LeaveRequest = {
  id: string
  employeeUid: string
  teamId: string
  type: LeaveType
  startAt: Date
  endAt: Date
  year?: number
  requestedMinutes: number
  durationMinutes?: number
  status: LeaveStatus
  note: string | null
  step1?: LeaveApprovalStep | null
  step2?: LeaveApprovalStep | null
  rejection?: LeaveRejection | null
  createdAt?: Date
  updatedAt?: Date
}

export type LeaveLogAction =
  | 'CREATED'
  | 'TL_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export type LeaveLog = {
  id: string
  action: LeaveLogAction
  actorUid: string
  at: Date
  meta: Record<string, unknown> | null
}

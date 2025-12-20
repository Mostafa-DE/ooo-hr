export type LeaveBalance = {
  id: string
  userId: string
  leaveTypeId: string
  year: number
  balanceMinutes: number
  updatedAt?: Date
  updatedBy?: string
  lastCarryoverAt?: Date
  lastCarryoverFromYear?: number
}

export type LeaveBalanceAdjustmentSource = 'admin' | 'system'

export type LeaveBalanceAdjustment = {
  id: string
  userId: string
  leaveTypeId: string
  year: number
  deltaMinutes: number
  reason: string
  reference: string | null
  actorUid: string
  source: LeaveBalanceAdjustmentSource
  createdAt?: Date
}

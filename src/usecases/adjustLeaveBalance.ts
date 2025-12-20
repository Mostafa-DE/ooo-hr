import type { LeaveBalanceRepository } from '@/lib/leaveBalanceRepository'

type AdjustLeaveBalanceContext = {
  leaveBalanceRepository: LeaveBalanceRepository
}

type AdjustLeaveBalanceInput = {
  userId: string
  leaveTypeId: string
  year: number
  deltaMinutes: number
  reason: string
  reference: string | null
  actorUid: string
}

export async function adjustLeaveBalance(
  context: AdjustLeaveBalanceContext,
  input: AdjustLeaveBalanceInput,
) {
  if (!input.reason.trim()) {
    throw new Error('Adjustment reason is required.')
  }

  if (input.deltaMinutes === 0) {
    throw new Error('Adjustment must change the balance.')
  }

  const nextBalance = await context.leaveBalanceRepository.applyAdjustmentWithLog({
    userId: input.userId,
    leaveTypeId: input.leaveTypeId,
    year: input.year,
    deltaMinutes: input.deltaMinutes,
    reason: input.reason.trim(),
    reference: input.reference,
    actorUid: input.actorUid,
    source: 'admin',
  })

  return { balanceMinutes: nextBalance }
}

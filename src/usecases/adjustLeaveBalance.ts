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
  joinDate?: Date
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

  if (!input.joinDate) {
    throw new Error('Join date must be set before adjusting balances.')
  }

  const currentBalance = await context.leaveBalanceRepository.fetchBalance(
    input.userId,
    input.leaveTypeId,
    input.year,
  )
  const nextBalance = (currentBalance?.balanceMinutes ?? 0) + input.deltaMinutes

  if (nextBalance < 0) {
    throw new Error(
      'Balance cannot go negative. Record as UNPAID or increase the leave balance.',
    )
  }

  const updatedBalance = await context.leaveBalanceRepository.applyAdjustmentWithLog({
    userId: input.userId,
    leaveTypeId: input.leaveTypeId,
    year: input.year,
    deltaMinutes: input.deltaMinutes,
    reason: input.reason.trim(),
    reference: input.reference,
    actorUid: input.actorUid,
    source: 'admin',
  })

  return { balanceMinutes: updatedBalance }
}

import type { LeaveBalanceRepository } from '@/lib/leaveBalanceRepository'

type CarryoverLeaveBalanceContext = {
  leaveBalanceRepository: LeaveBalanceRepository
}

type CarryoverLeaveBalanceInput = {
  userId: string
  leaveTypeId: string
  fromYear: number
  toYear: number
  actorUid: string
  joinDate?: Date
}

export async function carryoverLeaveBalance(
  context: CarryoverLeaveBalanceContext,
  input: CarryoverLeaveBalanceInput,
) {
  if (input.fromYear === input.toYear) {
    throw new Error('Carryover must target a different year.')
  }

  if (!input.joinDate) {
    throw new Error('Join date must be set before adjusting balances.')
  }

  const sourceBalance = await context.leaveBalanceRepository.fetchBalance(
    input.userId,
    input.leaveTypeId,
    input.fromYear,
  )

  if (!sourceBalance) {
    return { carried: false, balanceMinutes: 0 }
  }

  const targetBalance = await context.leaveBalanceRepository.fetchBalance(
    input.userId,
    input.leaveTypeId,
    input.toYear,
  )

  if (targetBalance?.lastCarryoverFromYear === input.fromYear) {
    return {
      carried: false,
      balanceMinutes: targetBalance.balanceMinutes,
    }
  }

  const deltaMinutes = sourceBalance.balanceMinutes

  const nextBalance = await context.leaveBalanceRepository.applyAdjustmentWithLog({
    userId: input.userId,
    leaveTypeId: input.leaveTypeId,
    year: input.toYear,
    deltaMinutes,
    reason: `Yearly carryover from ${input.fromYear}`,
    reference: null,
    actorUid: input.actorUid,
    source: 'system',
    lastCarryoverAt: new Date(),
    lastCarryoverFromYear: input.fromYear,
  })

  return { carried: true, balanceMinutes: nextBalance }
}

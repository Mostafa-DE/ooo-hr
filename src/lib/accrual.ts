type AccrualReferenceInput = {
  annualEntitlementMinutes: number
  joinMonth: number
  currentMonth: number
}

type AccrualReference = {
  monthlyRateMinutes: number
  monthsSinceJoin: number
  entitlementMinutes: number
  isValid: boolean
}

function isValidMonth(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 12
}

export function calculateAccrualReference(
  input: AccrualReferenceInput,
): AccrualReference {
  const annualEntitlement = Math.max(0, input.annualEntitlementMinutes)
  const monthlyRateMinutes = annualEntitlement / 12
  const hasValidMonths =
    isValidMonth(input.joinMonth) && isValidMonth(input.currentMonth)
  const monthsSinceJoin = hasValidMonths
    ? input.currentMonth - input.joinMonth + 1
    : 0
  const isValid = hasValidMonths && monthsSinceJoin >= 1
  const entitlementMinutes = Math.round(
    monthlyRateMinutes * Math.max(0, monthsSinceJoin),
  )

  return {
    monthlyRateMinutes,
    monthsSinceJoin: Math.max(0, monthsSinceJoin),
    entitlementMinutes,
    isValid,
  }
}


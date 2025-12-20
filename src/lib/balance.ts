export function makeBalanceId(userId: string, leaveTypeId: string, year: number) {
  return `${userId}__${leaveTypeId}__${year}`
}

export function isStaleBalanceYear(year: number, currentYear: number) {
  return year <= currentYear - 2
}

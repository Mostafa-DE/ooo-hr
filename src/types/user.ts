import type { Timestamp } from 'firebase/firestore'

type UserRole = 'admin' | 'employee' | 'team_lead' | 'manager'

type UserProfile = {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  isWhitelisted: boolean
  role: UserRole
  teamId: string | null
  joinDate?: Timestamp
  createdAt?: Timestamp
  lastLoginAt?: Timestamp
  annualEntitlementDays?: number
}

const userRoles = ['admin', 'employee', 'team_lead', 'manager'] as const

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && userRoles.includes(value as UserRole)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export type { UserRole, UserProfile }
export { isRecord, isUserRole }

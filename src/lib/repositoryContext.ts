import { createContext } from 'react'

import type { LeaveRequestRepository } from '@/lib/leaveRequestRepository'
import type { TeamRepository } from '@/lib/teamRepository'
import type { UserRepository } from '@/lib/userRepository'

type RepositoryContextValue = {
  userRepository: UserRepository | null
  teamRepository: TeamRepository | null
  leaveRequestRepository: LeaveRequestRepository | null
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null)

export type { RepositoryContextValue }
export { RepositoryContext }

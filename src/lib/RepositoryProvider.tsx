import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { createLeaveRequestRepository } from '@/lib/leaveRequestRepository'
import { db } from '@/lib/firebase'
import { RepositoryContext } from '@/lib/repositoryContext'
import { createTeamRepository } from '@/lib/teamRepository'
import { createUserRepository } from '@/lib/userRepository'

type RepositoryProviderProps = {
  children: ReactNode
}

export function RepositoryProvider({ children }: RepositoryProviderProps) {
  const value = useMemo(() => {
    return {
      userRepository: db ? createUserRepository(db) : null,
      teamRepository: db ? createTeamRepository(db) : null,
      leaveRequestRepository: db ? createLeaveRequestRepository(db) : null,
    }
  }, [])

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  )
}

import { useContext } from 'react'

import { RepositoryContext } from '@/lib/repositoryContext'

export function useRepositories() {
  const context = useContext(RepositoryContext)

  if (!context) {
    throw new Error('useRepositories must be used within RepositoryProvider')
  }

  return context
}

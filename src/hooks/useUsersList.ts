import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { UserProfile } from '@/types/user'

type UsersListState = {
  users: UserProfile[]
  loading: boolean
  error: Error | null
}

type UsersListStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => UsersListState
}

function createUsersListStore(
  subscribeUsers: (
    onData: (users: UserProfile[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): UsersListStore {
  let snapshot: UsersListState = {
    users: [],
    loading: true,
    error: null,
  }

  const listeners = new Set<() => void>()
  let unsubscribe: (() => void) | null = null

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const start = () => {
    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    unsubscribe = subscribeUsers(
      (users) => {
        snapshot = { users, loading: false, error: null }
        notify()
      },
      (error) => {
        snapshot = { users: [], loading: false, error }
        notify()
      },
    )
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)

    if (listeners.size === 1) {
      start()
    }

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0 && unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    }
  }

  const getSnapshot = () => snapshot

  return { subscribe, getSnapshot }
}

export function useUsersList(): UsersListState {
  const { userRepository } = useRepositories()

  const store = useMemo(() => {
    if (!userRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ users: [], loading: false, error: null }),
      }
    }

    return createUsersListStore(userRepository.subscribeUsers)
  }, [userRepository])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

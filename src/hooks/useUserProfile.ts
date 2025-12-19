import { useMemo, useSyncExternalStore } from 'react'

import { useAuth } from '@/auth/useAuth'
import { useRepositories } from '@/lib/useRepositories'
import type { UserProfile } from '@/types/user'

type UserProfileState = {
  profile: UserProfile | null
  loading: boolean
  error: Error | null
}

type ProfileStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => UserProfileState
}

function createProfileStore(
  userId: string | null,
  subscribeUserProfile: (
    uid: string,
    onData: (profile: UserProfile | null) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): ProfileStore {
  let snapshot: UserProfileState = {
    profile: null,
    loading: Boolean(userId),
    error: null,
  }

  const listeners = new Set<() => void>()
  let unsubscribe: (() => void) | null = null

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const start = () => {
    if (!userId) {
      snapshot = { profile: null, loading: false, error: null }
      notify()
      return
    }

    snapshot = { profile: snapshot.profile, loading: true, error: null }
    notify()

    unsubscribe = subscribeUserProfile(
      userId,
      (profile) => {
        snapshot = { profile, loading: false, error: null }
        notify()
      },
      (error) => {
        snapshot = { profile: null, loading: false, error }
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

export function useUserProfile(): UserProfileState {
  const { user } = useAuth()
  const { userRepository } = useRepositories()

  const store = useMemo(() => {
    if (!userRepository) {
      return createProfileStore(null, () => () => undefined)
    }

    return createProfileStore(user?.uid ?? null, userRepository.subscribeUserProfile)
  }, [user?.uid, userRepository])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { LeaveRequest } from '@/types/leave'

type AllRequestsState = {
  requests: LeaveRequest[]
  loading: boolean
  error: Error | null
}

type AllRequestsStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => AllRequestsState
}

function createAllRequestsStore(
  enabled: boolean,
  subscribeAllRequests: (
    onData: (requests: LeaveRequest[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): AllRequestsStore {
  let snapshot: AllRequestsState = {
    requests: [],
    loading: enabled,
    error: null,
  }

  const listeners = new Set<() => void>()
  let unsubscribe: (() => void) | null = null

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const start = () => {
    if (!enabled) {
      snapshot = { requests: [], loading: false, error: null }
      notify()
      return
    }

    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    unsubscribe = subscribeAllRequests(
      (requests) => {
        snapshot = { requests, loading: false, error: null }
        notify()
      },
      (error) => {
        snapshot = { requests: [], loading: false, error }
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

export function useAllRequests(enabled = false): AllRequestsState {
  const { leaveRequestRepository } = useRepositories()

  const store = useMemo(() => {
    if (!leaveRequestRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ requests: [], loading: false, error: null }),
      }
    }

    return createAllRequestsStore(
      enabled,
      leaveRequestRepository.subscribeAllRequests,
    )
  }, [enabled, leaveRequestRepository])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

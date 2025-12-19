import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { LeaveRequest } from '@/types/leave'

type TeamRequestsState = {
  requests: LeaveRequest[]
  loading: boolean
  error: Error | null
}

type TeamRequestsStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => TeamRequestsState
}

function createTeamRequestsStore(
  teamId: string | null,
  subscribeTeamRequests: (
    id: string,
    onData: (requests: LeaveRequest[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): TeamRequestsStore {
  let snapshot: TeamRequestsState = {
    requests: [],
    loading: Boolean(teamId),
    error: null,
  }

  const listeners = new Set<() => void>()
  let unsubscribe: (() => void) | null = null

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const start = () => {
    if (!teamId) {
      snapshot = { requests: [], loading: false, error: null }
      notify()
      return
    }

    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    unsubscribe = subscribeTeamRequests(
      teamId,
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

export function useTeamRequests(teamId: string | null): TeamRequestsState {
  const { leaveRequestRepository } = useRepositories()

  const store = useMemo(() => {
    if (!leaveRequestRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ requests: [], loading: false, error: null }),
      }
    }

    return createTeamRequestsStore(
      teamId,
      leaveRequestRepository.subscribeTeamRequests,
    )
  }, [leaveRequestRepository, teamId])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

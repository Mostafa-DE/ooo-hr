import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { LeaveRequest } from '@/types/leave'

export type LeaveRequestsState = {
  requests: LeaveRequest[]
  loading: boolean
  error: Error | null
}

type LeaveRequestsStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => LeaveRequestsState
}

function createLeaveRequestsStore(
  employeeUid: string | null,
  subscribeUserRequests: (
    uid: string,
    onData: (requests: LeaveRequest[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): LeaveRequestsStore {
  let snapshot: LeaveRequestsState = {
    requests: [],
    loading: Boolean(employeeUid),
    error: null,
  }

  const listeners = new Set<() => void>()
  let unsubscribe: (() => void) | null = null

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const start = () => {
    if (!employeeUid) {
      snapshot = { requests: [], loading: false, error: null }
      notify()
      return
    }

    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    unsubscribe = subscribeUserRequests(
      employeeUid,
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

export function useLeaveRequests(employeeUid: string | null): LeaveRequestsState {
  const { leaveRequestRepository } = useRepositories()

  const store = useMemo(() => {
    if (!leaveRequestRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ requests: [], loading: false, error: null }),
      }
    }

    return createLeaveRequestsStore(
      employeeUid,
      leaveRequestRepository.subscribeUserRequests,
    )
  }, [employeeUid, leaveRequestRepository])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

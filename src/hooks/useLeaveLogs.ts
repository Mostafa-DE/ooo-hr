import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { LeaveLog } from '@/types/leave'

type LeaveLogsState = {
  logs: LeaveLog[]
  loading: boolean
  error: Error | null
}

type LeaveLogsStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => LeaveLogsState
}

function createLeaveLogsStore(
  requestId: string | null,
  subscribeLeaveLogs: (
    id: string,
    onData: (logs: LeaveLog[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): LeaveLogsStore {
  let snapshot: LeaveLogsState = {
    logs: [],
    loading: Boolean(requestId),
    error: null,
  }

  const listeners = new Set<() => void>()
  let unsubscribe: (() => void) | null = null

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const start = () => {
    if (!requestId) {
      snapshot = { logs: [], loading: false, error: null }
      notify()
      return
    }

    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    unsubscribe = subscribeLeaveLogs(
      requestId,
      (logs) => {
        snapshot = { logs, loading: false, error: null }
        notify()
      },
      (error) => {
        snapshot = { logs: [], loading: false, error }
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

export function useLeaveLogs(requestId: string | null): LeaveLogsState {
  const { leaveRequestRepository } = useRepositories()

  const store = useMemo(() => {
    if (!leaveRequestRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ logs: [], loading: false, error: null }),
      }
    }

    return createLeaveLogsStore(
      requestId,
      leaveRequestRepository.subscribeLeaveLogs,
    )
  }, [leaveRequestRepository, requestId])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

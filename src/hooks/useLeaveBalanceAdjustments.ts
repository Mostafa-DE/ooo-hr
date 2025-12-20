import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { LeaveBalanceAdjustment } from '@/types/balance'

type LeaveBalanceAdjustmentsState = {
  adjustments: LeaveBalanceAdjustment[]
  loading: boolean
  error: Error | null
}

type LeaveBalanceAdjustmentsStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => LeaveBalanceAdjustmentsState
}

function createAdjustmentsStore(
  userId: string | null,
  subscribeUserAdjustments: (
    id: string,
    onData: (adjustments: LeaveBalanceAdjustment[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): LeaveBalanceAdjustmentsStore {
  let snapshot: LeaveBalanceAdjustmentsState = {
    adjustments: [],
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
      snapshot = { adjustments: [], loading: false, error: null }
      notify()
      return
    }

    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    unsubscribe = subscribeUserAdjustments(
      userId,
      (adjustments) => {
        snapshot = { adjustments, loading: false, error: null }
        notify()
      },
      (error) => {
        snapshot = { adjustments: [], loading: false, error }
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

export function useLeaveBalanceAdjustments(
  userId: string | null,
): LeaveBalanceAdjustmentsState {
  const { leaveBalanceAdjustmentRepository } = useRepositories()

  const store = useMemo(() => {
    if (!leaveBalanceAdjustmentRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ adjustments: [], loading: false, error: null }),
      }
    }

    return createAdjustmentsStore(
      userId,
      leaveBalanceAdjustmentRepository.subscribeUserAdjustments,
    )
  }, [leaveBalanceAdjustmentRepository, userId])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

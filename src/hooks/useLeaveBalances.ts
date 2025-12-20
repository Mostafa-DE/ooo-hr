import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { LeaveBalance } from '@/types/balance'

type LeaveBalancesState = {
  balances: LeaveBalance[]
  loading: boolean
  error: Error | null
}

type LeaveBalancesStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => LeaveBalancesState
}

function createLeaveBalancesStore(
  userId: string | null,
  subscribeUserBalances: (
    id: string,
    onData: (balances: LeaveBalance[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): LeaveBalancesStore {
  let snapshot: LeaveBalancesState = {
    balances: [],
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
      snapshot = { balances: [], loading: false, error: null }
      notify()
      return
    }

    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    unsubscribe = subscribeUserBalances(
      userId,
      (balances) => {
        snapshot = { balances, loading: false, error: null }
        notify()
      },
      (error) => {
        snapshot = { balances: [], loading: false, error }
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

export function useLeaveBalances(userId: string | null): LeaveBalancesState {
  const { leaveBalanceRepository } = useRepositories()

  const store = useMemo(() => {
    if (!leaveBalanceRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ balances: [], loading: false, error: null }),
      }
    }

    return createLeaveBalancesStore(
      userId,
      leaveBalanceRepository.subscribeUserBalances,
    )
  }, [leaveBalanceRepository, userId])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

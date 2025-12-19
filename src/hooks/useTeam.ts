import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { Team } from '@/types/team'

type TeamState = {
  team: Team | null
  loading: boolean
  error: Error | null
}

type TeamStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => TeamState
}

function createTeamStore(
  teamId: string | null,
  subscribeTeam: (
    id: string,
    onData: (team: Team | null) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): TeamStore {
  let snapshot: TeamState = {
    team: null,
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
      snapshot = { team: null, loading: false, error: null }
      notify()
      return
    }

    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    unsubscribe = subscribeTeam(
      teamId,
      (team) => {
        snapshot = { team, loading: false, error: null }
        notify()
      },
      (error) => {
        snapshot = { team: null, loading: false, error }
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

export function useTeam(teamId: string | null): TeamState {
  const { teamRepository } = useRepositories()

  const store = useMemo(() => {
    if (!teamRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ team: null, loading: false, error: null }),
      }
    }

    return createTeamStore(teamId, teamRepository.subscribeTeam)
  }, [teamId, teamRepository])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

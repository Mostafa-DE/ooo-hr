import { useMemo, useSyncExternalStore } from 'react'

import { useRepositories } from '@/lib/useRepositories'
import type { Team } from '@/types/team'

type TeamsListState = {
  teams: Team[]
  loading: boolean
  error: Error | null
}

type TeamsListStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => TeamsListState
}

function createTeamsListStore(
  subscribeTeams: (
    onData: (teams: Team[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): TeamsListStore {
  let snapshot: TeamsListState = {
    teams: [],
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

    unsubscribe = subscribeTeams(
      (teams) => {
        snapshot = { teams, loading: false, error: null }
        notify()
      },
      (error) => {
        snapshot = { teams: [], loading: false, error }
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

export function useTeamsList(): TeamsListState {
  const { teamRepository } = useRepositories()

  const store = useMemo(() => {
    if (!teamRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ teams: [], loading: false, error: null }),
      }
    }

    return createTeamsListStore(teamRepository.subscribeTeams)
  }, [teamRepository])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

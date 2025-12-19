import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import { filterApprovedRequests } from '@/lib/leave'
import { useRepositories } from '@/lib/useRepositories'
import type { LeaveRequest } from '@/types/leave'
import type { UserProfile } from '@/types/user'

type TeamCalendarState = {
  requests: LeaveRequest[]
  usersById: Record<string, UserProfile>
  loading: boolean
  error: Error | null
}

type CalendarRequestsState = {
  requests: LeaveRequest[]
  loading: boolean
  error: Error | null
}

type CalendarRequestsStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => CalendarRequestsState
}

function createCalendarRequestsStore(
  teamId: string | null,
  includeAllTeams: boolean,
  subscribeTeamRequests: (
    id: string,
    onData: (requests: LeaveRequest[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
  subscribeApprovedRequests: (
    onData: (requests: LeaveRequest[]) => void,
    onError?: (error: Error) => void,
  ) => () => void,
): CalendarRequestsStore {
  let snapshot: CalendarRequestsState = {
    requests: [],
    loading: includeAllTeams || Boolean(teamId),
    error: null,
  }

  const listeners = new Set<() => void>()
  let unsubscribe: (() => void) | null = null

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const start = () => {
    if (!includeAllTeams && !teamId) {
      snapshot = { requests: [], loading: false, error: null }
      notify()
      return
    }

    snapshot = { ...snapshot, loading: true, error: null }
    notify()

    const onData = (requests: LeaveRequest[]) => {
      const approved = includeAllTeams
        ? filterApprovedRequests(requests)
        : filterApprovedRequests(requests, teamId)
      snapshot = { requests: approved, loading: false, error: null }
      notify()
    }

    const onError = (error: Error) => {
      snapshot = { requests: [], loading: false, error }
      notify()
    }

    if (includeAllTeams) {
      unsubscribe = subscribeApprovedRequests(onData, onError)
    } else if (teamId) {
      unsubscribe = subscribeTeamRequests(teamId, onData, onError)
    }
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

export function useTeamCalendar(
  teamId: string | null,
  includeAllTeams = false,
): TeamCalendarState {
  const { userRepository, leaveRequestRepository } = useRepositories()

  const store = useMemo(() => {
    if (!leaveRequestRepository) {
      return {
        subscribe: () => () => undefined,
        getSnapshot: () => ({ requests: [], loading: false, error: null }),
      }
    }

    return createCalendarRequestsStore(
      teamId,
      includeAllTeams,
      leaveRequestRepository.subscribeTeamRequests,
      leaveRequestRepository.subscribeApprovedRequests,
    )
  }, [includeAllTeams, leaveRequestRepository, teamId])

  const { requests, loading: requestsLoading, error: requestsError } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )

  const userIds = useMemo(() => {
    const ids = new Set<string>()
    requests.forEach((request) => {
      if (request.employeeUid) {
        ids.add(request.employeeUid)
      }
    })
    return Array.from(ids).sort()
  }, [requests])

  const [usersById, setUsersById] = useState<Record<string, UserProfile>>({})
  const [usersError, setUsersError] = useState<Error | null>(null)
  const [loadedKey, setLoadedKey] = useState<string>('')

  const userIdsKey = userIds.join('|')
  const shouldFetch = Boolean(userRepository && userIdsKey.length > 0)

  useEffect(() => {
    if (!shouldFetch || !userRepository) {
      return
    }

    let active = true

    userRepository
      .fetchUsersByIds(userIds)
      .then((profiles) => {
        if (!active) {
          return
        }

        const map: Record<string, UserProfile> = {}
        profiles.forEach((profile) => {
          map[profile.uid] = profile
        })
        setUsersById(map)
        setLoadedKey(userIdsKey)
        setUsersError(null)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        setUsersById({})
        setUsersError(error instanceof Error ? error : new Error('Failed to load users'))
      })

    return () => {
      active = false
    }
  }, [shouldFetch, userIds, userIdsKey, userRepository])

  const usersLoading = shouldFetch && loadedKey !== userIdsKey && !usersError
  const resolvedUsersById = shouldFetch ? usersById : {}
  const resolvedUsersError =
    shouldFetch && loadedKey !== userIdsKey ? null : usersError

  return {
    requests,
    usersById: resolvedUsersById,
    loading: requestsLoading || usersLoading,
    error: requestsError ?? resolvedUsersError,
  }
}

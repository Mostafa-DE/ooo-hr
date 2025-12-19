import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

import type { Team } from '@/types/team'
import { isRecord } from '@/types/user'

type CreateTeamInput = {
  name: string
}

type UpdateTeamInput = {
  id: string
  name: string
  leadUid: string | null
  managerUid: string | null
}

type TeamRepository = {
  createTeam: (input: CreateTeamInput) => Promise<void>
  updateTeam: (input: UpdateTeamInput) => Promise<void>
  updateTeamAssignments: (input: {
    id: string
    leadUid?: string | null
    managerUid?: string | null
  }) => Promise<void>
  subscribeTeam: (
    teamId: string,
    onData: (team: Team | null) => void,
    onError?: (error: Error) => void,
  ) => () => void
  subscribeTeams: (
    onData: (teams: Team[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : undefined
}

function buildTeam(data: unknown, id: string): Team {
  const record = isRecord(data) ? data : null

  return {
    id,
    name: typeof record?.name === 'string' ? record.name : 'Untitled',
    leadUid: typeof record?.leadUid === 'string' ? record.leadUid : null,
    managerUid: typeof record?.managerUid === 'string' ? record.managerUid : null,
    createdAt: readTimestamp(record?.createdAt),
    updatedAt: readTimestamp(record?.updatedAt),
  }
}

export type { CreateTeamInput, TeamRepository, UpdateTeamInput }

export function createTeamRepository(db: Firestore): TeamRepository {
  return {
    createTeam: async (input) => {
      const ref = doc(collection(db, 'teams'))
      await setDoc(ref, {
        name: input.name,
        leadUid: null,
        managerUid: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    updateTeam: async (input) => {
      const ref = doc(db, 'teams', input.id)

      await updateDoc(ref, {
        name: input.name,
        leadUid: input.leadUid,
        managerUid: input.managerUid,
        updatedAt: serverTimestamp(),
      })
    },
    updateTeamAssignments: async (input) => {
      const ref = doc(db, 'teams', input.id)
      const payload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      }

      if ('leadUid' in input) {
        payload.leadUid = input.leadUid
      }

      if ('managerUid' in input) {
        payload.managerUid = input.managerUid
      }

      await updateDoc(ref, payload)
    },
    subscribeTeam: (teamId, onData, onError) => {
      const ref = doc(db, 'teams', teamId)

      return onSnapshot(
        ref,
        (snapshot) => {
          if (!snapshot.exists()) {
            onData(null)
            return
          }

          onData(buildTeam(snapshot.data(), snapshot.id))
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load team'))
        },
      )
    },
    subscribeTeams: (onData, onError) => {
      return onSnapshot(
        collection(db, 'teams'),
        (snapshot) => {
          const teams = snapshot.docs.map((docSnapshot) =>
            buildTeam(docSnapshot.data(), docSnapshot.id),
          )

          teams.sort((a, b) => a.name.localeCompare(b.name))
          onData(teams)
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load teams'))
        },
      )
    },
  }
}

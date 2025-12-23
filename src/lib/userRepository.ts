import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
  Timestamp,
} from 'firebase/firestore'

import type { UserProfile, UserRole } from '@/types/user'
import { isRecord, isUserRole } from '@/types/user'

type CreateUserInput = {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
}

type UpdateUserAdminInput = {
  uid: string
  isWhitelisted: boolean
  role: UserRole
  teamId: string | null
}

type UserRepository = {
  upsertUserOnLogin: (input: CreateUserInput) => Promise<void>
  updateUserAdmin: (input: UpdateUserAdminInput) => Promise<void>
  updateUserJoinDate: (input: { uid: string; joinDate: Date }) => Promise<void>
  fetchUsersByIds: (uids: string[]) => Promise<UserProfile[]>
  subscribeUsers: (
    onData: (users: UserProfile[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
  subscribeUserProfile: (
    uid: string,
    onData: (profile: UserProfile | null) => void,
    onError?: (error: Error) => void,
  ) => () => void
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : undefined
}

function buildUserProfile(
  data: unknown,
  fallback: {
    uid: string
    email?: string | null
    displayName?: string | null
    photoURL?: string | null
  },
): UserProfile {
  const record = isRecord(data) ? data : null
  const role = record && isUserRole(record.role) ? record.role : 'employee'

  return {
    uid: typeof record?.uid === 'string' ? record.uid : fallback.uid,
    email: typeof record?.email === 'string' ? record.email : fallback.email ?? '',
    displayName:
      typeof record?.displayName === 'string'
        ? record.displayName
        : fallback.displayName ?? 'Employee',
    photoURL:
      typeof record?.photoURL === 'string' ? record.photoURL : fallback.photoURL ?? null,
    isWhitelisted: record?.isWhitelisted === true,
    role,
    teamId: typeof record?.teamId === 'string' ? record.teamId : null,
    joinDate: readTimestamp(record?.joinDate),
    createdAt: readTimestamp(record?.createdAt),
    lastLoginAt: readTimestamp(record?.lastLoginAt),
  }
}

export type { CreateUserInput, UpdateUserAdminInput, UserRepository }

export function createUserRepository(db: Firestore): UserRepository {
  return {
    upsertUserOnLogin: async (input) => {
      const ref = doc(db, 'users', input.uid)
      const snapshot = await getDoc(ref)

      if (snapshot.exists()) {
        await setDoc(
          ref,
          {
            uid: input.uid,
            email: input.email,
            displayName: input.displayName,
            photoURL: input.photoURL,
            lastLoginAt: serverTimestamp(),
          },
          { merge: true },
        )
        return
      }

      await setDoc(ref, {
        uid: input.uid,
        email: input.email,
        displayName: input.displayName,
        photoURL: input.photoURL,
        isWhitelisted: false,
        role: 'employee',
        teamId: null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      })
    },
    updateUserAdmin: async (input) => {
      const ref = doc(db, 'users', input.uid)

      await updateDoc(ref, {
        isWhitelisted: input.isWhitelisted,
        role: input.role,
        teamId: input.teamId,
      })
    },
    updateUserJoinDate: async (input) => {
      const ref = doc(db, 'users', input.uid)

      await updateDoc(ref, {
        joinDate: Timestamp.fromDate(input.joinDate),
      })
    },
    fetchUsersByIds: async (uids) => {
      const uniqueIds = Array.from(new Set(uids)).filter((uid) => uid.length > 0)

      if (uniqueIds.length === 0) {
        return []
      }

      const snapshots = await Promise.all(
        uniqueIds.map((uid) => getDoc(doc(db, 'users', uid))),
      )

      return snapshots
        .filter((snapshot) => snapshot.exists())
        .map((snapshot) =>
          buildUserProfile(snapshot.data(), { uid: snapshot.id }),
        )
    },
    subscribeUsers: (onData, onError) => {
      return onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const users = snapshot.docs.map((docSnapshot) =>
            buildUserProfile(docSnapshot.data(), {
              uid: docSnapshot.id,
            }),
          )

          users.sort((a, b) => a.displayName.localeCompare(b.displayName))
          onData(users)
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load users'))
        },
      )
    },
    subscribeUserProfile: (uid, onData, onError) => {
      const ref = doc(db, 'users', uid)

      return onSnapshot(
        ref,
        (snapshot) => {
          if (!snapshot.exists()) {
            onData(null)
            return
          }

          onData(buildUserProfile(snapshot.data(), { uid }))
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load profile'))
        },
      )
    },
  }
}

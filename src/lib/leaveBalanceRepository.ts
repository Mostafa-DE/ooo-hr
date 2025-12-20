import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
  Timestamp,
  query,
  where,
  runTransaction,
} from 'firebase/firestore'

import type { LeaveBalance } from '@/types/balance'
import { isRecord } from '@/types/user'
import { makeBalanceId } from '@/lib/balance'
import type { LeaveBalanceAdjustmentSource } from '@/types/balance'

export type UpsertLeaveBalanceInput = {
  userId: string
  leaveTypeId: string
  year: number
  balanceMinutes: number
  updatedBy: string
  lastCarryoverAt?: Date | null
  lastCarryoverFromYear?: number | null
}

type LeaveBalanceRepository = {
  fetchBalance: (
    userId: string,
    leaveTypeId: string,
    year: number,
  ) => Promise<LeaveBalance | null>
  fetchUserBalances: (userId: string) => Promise<LeaveBalance[]>
  upsertBalance: (input: UpsertLeaveBalanceInput) => Promise<void>
  applyAdjustmentWithLog: (input: {
    userId: string
    leaveTypeId: string
    year: number
    deltaMinutes: number
    reason: string
    reference: string | null
    actorUid: string
    source: LeaveBalanceAdjustmentSource
    lastCarryoverAt?: Date | null
    lastCarryoverFromYear?: number | null
  }) => Promise<number>
  subscribeUserBalances: (
    userId: string,
    onData: (balances: LeaveBalance[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : undefined
}

function buildLeaveBalance(data: unknown, id: string): LeaveBalance {
  const record = isRecord(data) ? data : null
  const year =
    typeof record?.year === 'number'
      ? record.year
      : Number.parseInt(id.split('__').at(-1) ?? '0', 10)

  return {
    id,
    userId: typeof record?.userId === 'string' ? record.userId : '',
    leaveTypeId: typeof record?.leaveTypeId === 'string' ? record.leaveTypeId : '',
    year: Number.isFinite(year) ? year : 0,
    balanceMinutes:
      typeof record?.balanceMinutes === 'number' ? record.balanceMinutes : 0,
    updatedAt: readTimestamp(record?.updatedAt),
    updatedBy: typeof record?.updatedBy === 'string' ? record.updatedBy : undefined,
    lastCarryoverAt: readTimestamp(record?.lastCarryoverAt),
    lastCarryoverFromYear:
      typeof record?.lastCarryoverFromYear === 'number'
        ? record.lastCarryoverFromYear
        : undefined,
  }
}

export type { LeaveBalanceRepository }

export function createLeaveBalanceRepository(
  db: Firestore,
): LeaveBalanceRepository {
  return {
    fetchBalance: async (userId, leaveTypeId, year) => {
      const ref = doc(db, 'leaveBalances', makeBalanceId(userId, leaveTypeId, year))
      const snapshot = await getDoc(ref)

      if (!snapshot.exists()) {
        return null
      }

      return buildLeaveBalance(snapshot.data(), snapshot.id)
    },
    fetchUserBalances: async (userId) => {
      const balancesQuery = query(
        collection(db, 'leaveBalances'),
        where('userId', '==', userId),
      )
      const snapshot = await getDocs(balancesQuery)

      return snapshot.docs
        .map((docSnapshot) => buildLeaveBalance(docSnapshot.data(), docSnapshot.id))
        .sort((a, b) => b.year - a.year)
    },
    upsertBalance: async (input) => {
      const ref = doc(db, 'leaveBalances', makeBalanceId(input.userId, input.leaveTypeId, input.year))

      await setDoc(
        ref,
        {
          userId: input.userId,
          leaveTypeId: input.leaveTypeId,
          year: input.year,
          balanceMinutes: input.balanceMinutes,
          updatedBy: input.updatedBy,
          updatedAt: serverTimestamp(),
          lastCarryoverAt: input.lastCarryoverAt ?? null,
          lastCarryoverFromYear: input.lastCarryoverFromYear ?? null,
        },
        { merge: true },
      )
    },
    applyAdjustmentWithLog: async (input) => {
      const balanceRef = doc(
        db,
        'leaveBalances',
        makeBalanceId(input.userId, input.leaveTypeId, input.year),
      )
      const adjustmentRef = doc(collection(db, 'leaveBalanceAdjustments'))

      return runTransaction(db, async (transaction) => {
        const balanceSnapshot = await transaction.get(balanceRef)
        const currentBalance =
          balanceSnapshot.exists() && typeof balanceSnapshot.data()?.balanceMinutes === 'number'
            ? balanceSnapshot.data()?.balanceMinutes
            : 0
        const nextBalance = currentBalance + input.deltaMinutes

        transaction.set(
          balanceRef,
          {
            userId: input.userId,
            leaveTypeId: input.leaveTypeId,
            year: input.year,
            balanceMinutes: nextBalance,
            updatedBy: input.actorUid,
            updatedAt: serverTimestamp(),
            lastCarryoverAt: input.lastCarryoverAt ?? null,
            lastCarryoverFromYear: input.lastCarryoverFromYear ?? null,
          },
          { merge: true },
        )

        transaction.set(adjustmentRef, {
          userId: input.userId,
          leaveTypeId: input.leaveTypeId,
          year: input.year,
          deltaMinutes: input.deltaMinutes,
          reason: input.reason,
          reference: input.reference,
          actorUid: input.actorUid,
          source: input.source,
          createdAt: serverTimestamp(),
        })

        return nextBalance
      })
    },
    subscribeUserBalances: (userId, onData, onError) => {
      const balancesQuery = query(
        collection(db, 'leaveBalances'),
        where('userId', '==', userId),
      )

      return onSnapshot(
        balancesQuery,
        (snapshot) => {
          const balances = snapshot.docs
            .map((docSnapshot) =>
              buildLeaveBalance(docSnapshot.data(), docSnapshot.id),
            )
            .sort((a, b) => b.year - a.year)
          onData(balances)
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load balances'))
        },
      )
    },
  }
}

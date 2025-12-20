import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  type Firestore,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'

import type { LeaveBalanceAdjustment, LeaveBalanceAdjustmentSource } from '@/types/balance'
import { isRecord } from '@/types/user'

export type CreateLeaveBalanceAdjustmentInput = {
  userId: string
  leaveTypeId: string
  year: number
  deltaMinutes: number
  reason: string
  reference: string | null
  actorUid: string
  source: LeaveBalanceAdjustmentSource
}

type LeaveBalanceAdjustmentRepository = {
  createAdjustment: (input: CreateLeaveBalanceAdjustmentInput) => Promise<void>
  subscribeUserAdjustments: (
    userId: string,
    onData: (adjustments: LeaveBalanceAdjustment[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : undefined
}

function buildAdjustment(data: unknown, id: string): LeaveBalanceAdjustment {
  const record = isRecord(data) ? data : null

  return {
    id,
    userId: typeof record?.userId === 'string' ? record.userId : '',
    leaveTypeId: typeof record?.leaveTypeId === 'string' ? record.leaveTypeId : '',
    year: typeof record?.year === 'number' ? record.year : 0,
    deltaMinutes: typeof record?.deltaMinutes === 'number' ? record.deltaMinutes : 0,
    reason: typeof record?.reason === 'string' ? record.reason : '',
    reference: typeof record?.reference === 'string' ? record.reference : null,
    actorUid: typeof record?.actorUid === 'string' ? record.actorUid : '',
    source: (record?.source as LeaveBalanceAdjustmentSource) ?? 'admin',
    createdAt: readTimestamp(record?.createdAt),
  }
}

export type { LeaveBalanceAdjustmentRepository }

export function createLeaveBalanceAdjustmentRepository(
  db: Firestore,
): LeaveBalanceAdjustmentRepository {
  return {
    createAdjustment: async (input) => {
      await addDoc(collection(db, 'leaveBalanceAdjustments'), {
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
    },
    subscribeUserAdjustments: (userId, onData, onError) => {
      const adjustmentsQuery = query(
        collection(db, 'leaveBalanceAdjustments'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      )

      return onSnapshot(
        adjustmentsQuery,
        (snapshot) => {
          const adjustments = snapshot.docs.map((docSnapshot) =>
            buildAdjustment(docSnapshot.data(), docSnapshot.id),
          )
          onData(adjustments)
        },
        (error) => {
          onError?.(
            error instanceof Error
              ? error
              : new Error('Failed to load balance adjustments'),
          )
        },
      )
    },
  }
}

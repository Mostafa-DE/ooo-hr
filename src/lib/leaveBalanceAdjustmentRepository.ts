import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  type Firestore,
  where,
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
  subscribeAllAdjustments: (
    onData: (adjustments: LeaveBalanceAdjustment[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
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
    subscribeAllAdjustments: (onData, onError) => {
      const adjustmentsQuery = query(collection(db, 'leaveBalanceAdjustments'))

      return onSnapshot(
        adjustmentsQuery,
        (snapshot) => {
          const adjustments = snapshot.docs
            .map((docSnapshot) => buildAdjustment(docSnapshot.data(), docSnapshot.id))
            .sort((a, b) => {
              const aTime = a.createdAt?.getTime() ?? 0
              const bTime = b.createdAt?.getTime() ?? 0
              return bTime - aTime
            })
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
    subscribeUserAdjustments: (userId, onData, onError) => {
      const sources: Record<string, LeaveBalanceAdjustment[]> = {
        userId: [],
        uid: [],
        employeeUid: [],
      }

      const mergeAndNotify = () => {
        const merged = new Map<string, LeaveBalanceAdjustment>()
        Object.values(sources).forEach((list) => {
          list.forEach((adjustment) => {
            merged.set(adjustment.id, adjustment)
          })
        })

        const sorted = Array.from(merged.values()).sort((a, b) => {
          const aTime = a.createdAt?.getTime() ?? 0
          const bTime = b.createdAt?.getTime() ?? 0
          return bTime - aTime
        })

        onData(sorted)
      }

      const subscribeForField = (field: keyof typeof sources) => {
        const adjustmentsQuery = query(
          collection(db, 'leaveBalanceAdjustments'),
          where(field, '==', userId),
        )

        return onSnapshot(
          adjustmentsQuery,
          (snapshot) => {
            sources[field] = snapshot.docs.map((docSnapshot) =>
              buildAdjustment(docSnapshot.data(), docSnapshot.id),
            )
            mergeAndNotify()
          },
          (error) => {
            onError?.(
              error instanceof Error
                ? error
                : new Error('Failed to load balance adjustments'),
            )
          },
        )
      }

      const unsubscribeUserId = subscribeForField('userId')
      const unsubscribeUid = subscribeForField('uid')
      const unsubscribeEmployeeUid = subscribeForField('employeeUid')

      return () => {
        unsubscribeUserId()
        unsubscribeUid()
        unsubscribeEmployeeUid()
      }
    },
  }
}

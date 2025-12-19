import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type Firestore,
  where,
  writeBatch,
} from 'firebase/firestore'

import type {
  LeaveApprovalStep,
  LeaveLog,
  LeaveLogAction,
  LeaveRejection,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '@/types/leave'
import { isRecord } from '@/types/user'

export type CreateLeaveRequestInput = {
  employeeUid: string
  teamId: string
  type: LeaveType
  startAt: Date
  endAt: Date
  requestedMinutes: number
  note: string | null
}

export type CancelLeaveRequestInput = {
  requestId: string
  actorUid: string
  reason?: string | null
}

export type LeaveRequestRepository = {
  createLeaveRequest: (input: CreateLeaveRequestInput) => Promise<string>
  autoApproveRequest: (input: { requestId: string; actorUid: string }) => Promise<void>
  cancelLeaveRequest: (input: CancelLeaveRequestInput) => Promise<void>
  fetchUserRequests: (employeeUid: string) => Promise<LeaveRequest[]>
  fetchTeamRequests: (teamId: string) => Promise<LeaveRequest[]>
  approveAsTeamLead: (input: {
    requestId: string
    actorUid: string
    autoApprove: boolean
  }) => Promise<void>
  approveAsManager: (input: {
    requestId: string
    actorUid: string
    direct: boolean
  }) => Promise<void>
  rejectAsTeamLead: (input: {
    requestId: string
    actorUid: string
    reason: string | null
  }) => Promise<void>
  rejectAsManager: (input: {
    requestId: string
    actorUid: string
    reason: string | null
  }) => Promise<void>
  subscribeTeamRequests: (
    teamId: string,
    onData: (requests: LeaveRequest[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
  subscribeApprovedRequests: (
    onData: (requests: LeaveRequest[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
  subscribeUserRequests: (
    employeeUid: string,
    onData: (requests: LeaveRequest[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
  subscribeLeaveLogs: (
    requestId: string,
    onData: (logs: LeaveLog[]) => void,
    onError?: (error: Error) => void,
  ) => () => void
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : undefined
}

function buildLeaveRequest(data: unknown, id: string): LeaveRequest {
  const record = isRecord(data) ? data : null

  const startAt = record?.startAt instanceof Timestamp ? record.startAt.toDate() : new Date(0)
  const endAt = record?.endAt instanceof Timestamp ? record.endAt.toDate() : new Date(0)
  const step1 = record?.step1 && isRecord(record.step1) ? record.step1 : null
  const step2 = record?.step2 && isRecord(record.step2) ? record.step2 : null
  const rejection = record?.rejection && isRecord(record.rejection) ? record.rejection : null

  const parsedStep1: LeaveApprovalStep | null =
    step1 && typeof step1.byUid === 'string' && step1.at instanceof Timestamp
      ? { byUid: step1.byUid, at: step1.at.toDate() }
      : null

  const parsedStep2: LeaveApprovalStep | null =
    step2 && typeof step2.byUid === 'string' && step2.at instanceof Timestamp
      ? { byUid: step2.byUid, at: step2.at.toDate() }
      : null

  const parsedRejection: LeaveRejection | null =
    rejection &&
    typeof rejection.byUid === 'string' &&
    rejection.at instanceof Timestamp
      ? {
          byUid: rejection.byUid,
          at: rejection.at.toDate(),
          reason: typeof rejection.reason === 'string' ? rejection.reason : null,
        }
      : null

  return {
    id,
    employeeUid: typeof record?.employeeUid === 'string' ? record.employeeUid : '',
    teamId: typeof record?.teamId === 'string' ? record.teamId : '',
    type: (record?.type as LeaveType) ?? 'annual',
    startAt,
    endAt,
    requestedMinutes: typeof record?.requestedMinutes === 'number' ? record.requestedMinutes : 0,
    status: (record?.status as LeaveStatus) ?? 'SUBMITTED',
    note: typeof record?.note === 'string' ? record.note : null,
    step1: parsedStep1,
    step2: parsedStep2,
    rejection: parsedRejection,
    createdAt: readTimestamp(record?.createdAt),
    updatedAt: readTimestamp(record?.updatedAt),
  }
}

function buildLeaveLog(data: unknown, id: string): LeaveLog {
  const record = isRecord(data) ? data : null

  return {
    id,
    action: (record?.action as LeaveLogAction) ?? 'CREATED',
    actorUid: typeof record?.actorUid === 'string' ? record.actorUid : '',
    at: record?.at instanceof Timestamp ? record.at.toDate() : new Date(0),
    meta: record?.meta && typeof record.meta === 'object' ? (record.meta as Record<string, unknown>) : null,
  }
}

export function createLeaveRequestRepository(db: Firestore): LeaveRequestRepository {
  return {
    createLeaveRequest: async (input) => {
      const requestRef = doc(collection(db, 'leaveRequests'))
      const logRef = doc(collection(requestRef, 'logs'))
      const batch = writeBatch(db)

      batch.set(requestRef, {
        employeeUid: input.employeeUid,
        teamId: input.teamId,
        type: input.type,
        startAt: input.startAt,
        endAt: input.endAt,
        requestedMinutes: input.requestedMinutes,
        status: 'SUBMITTED',
        note: input.note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      batch.set(logRef, {
        action: 'CREATED',
        actorUid: input.employeeUid,
        at: serverTimestamp(),
        meta: null,
      })

      await batch.commit()
      return requestRef.id
    },
    autoApproveRequest: async (input) => {
      const requestRef = doc(db, 'leaveRequests', input.requestId)
      const logRef = doc(collection(requestRef, 'logs'))
      const batch = writeBatch(db)

      batch.update(requestRef, {
        status: 'APPROVED',
        step1: null,
        step2: null,
        rejection: null,
        updatedAt: serverTimestamp(),
      })
      batch.set(logRef, {
        action: 'APPROVED',
        actorUid: input.actorUid,
        at: serverTimestamp(),
        meta: { auto: true },
      })

      await batch.commit()
    },
    cancelLeaveRequest: async (input) => {
      const requestRef = doc(db, 'leaveRequests', input.requestId)
      const logRef = doc(collection(requestRef, 'logs'))
      const batch = writeBatch(db)

      batch.update(requestRef, {
        status: 'CANCELLED',
        updatedAt: serverTimestamp(),
      })

      batch.set(logRef, {
        action: 'CANCELLED',
        actorUid: input.actorUid,
        at: serverTimestamp(),
        meta: input.reason ? { reason: input.reason } : null,
      })

      await batch.commit()
    },
    approveAsTeamLead: async (input) => {
      const requestRef = doc(db, 'leaveRequests', input.requestId)
      const logRef = doc(collection(requestRef, 'logs'))
      const batch = writeBatch(db)

      if (input.autoApprove) {
        const approveLogRef = doc(collection(requestRef, 'logs'))

        batch.update(requestRef, {
          status: 'APPROVED',
          step1: { byUid: input.actorUid, at: serverTimestamp() },
          step2: null,
          rejection: null,
          updatedAt: serverTimestamp(),
        })
        batch.set(logRef, {
          action: 'TL_APPROVED',
          actorUid: input.actorUid,
          at: serverTimestamp(),
          meta: null,
        })
        batch.set(approveLogRef, {
          action: 'APPROVED',
          actorUid: input.actorUid,
          at: serverTimestamp(),
          meta: null,
        })
      } else {
        batch.update(requestRef, {
          status: 'TL_APPROVED',
          step1: { byUid: input.actorUid, at: serverTimestamp() },
          updatedAt: serverTimestamp(),
        })
        batch.set(logRef, {
          action: 'TL_APPROVED',
          actorUid: input.actorUid,
          at: serverTimestamp(),
          meta: null,
        })
      }

      await batch.commit()
    },
    approveAsManager: async (input) => {
      const requestRef = doc(db, 'leaveRequests', input.requestId)
      const logRef = doc(collection(requestRef, 'logs'))
      const batch = writeBatch(db)

      batch.update(requestRef, {
        status: 'APPROVED',
        step2: { byUid: input.actorUid, at: serverTimestamp() },
        rejection: null,
        updatedAt: serverTimestamp(),
      })
      batch.set(logRef, {
        action: 'APPROVED',
        actorUid: input.actorUid,
        at: serverTimestamp(),
        meta: input.direct ? { direct: true } : null,
      })

      await batch.commit()
    },
    rejectAsTeamLead: async (input) => {
      const requestRef = doc(db, 'leaveRequests', input.requestId)
      const logRef = doc(collection(requestRef, 'logs'))
      const batch = writeBatch(db)

      batch.update(requestRef, {
        status: 'REJECTED',
        rejection: {
          byUid: input.actorUid,
          at: serverTimestamp(),
          reason: input.reason,
        },
        updatedAt: serverTimestamp(),
      })
      batch.set(logRef, {
        action: 'REJECTED',
        actorUid: input.actorUid,
        at: serverTimestamp(),
        meta: input.reason ? { reason: input.reason } : null,
      })

      await batch.commit()
    },
    rejectAsManager: async (input) => {
      const requestRef = doc(db, 'leaveRequests', input.requestId)
      const logRef = doc(collection(requestRef, 'logs'))
      const batch = writeBatch(db)

      batch.update(requestRef, {
        status: 'REJECTED',
        rejection: {
          byUid: input.actorUid,
          at: serverTimestamp(),
          reason: input.reason,
        },
        updatedAt: serverTimestamp(),
      })
      batch.set(logRef, {
        action: 'REJECTED',
        actorUid: input.actorUid,
        at: serverTimestamp(),
        meta: input.reason ? { reason: input.reason } : null,
      })

      await batch.commit()
    },
    fetchUserRequests: async (employeeUid) => {
      const requestQuery = query(
        collection(db, 'leaveRequests'),
        where('employeeUid', '==', employeeUid),
      )

      const snapshot = await getDocs(requestQuery)
      const requests = snapshot.docs.map((docSnapshot) =>
        buildLeaveRequest(docSnapshot.data(), docSnapshot.id),
      )

      return requests.sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
    },
    fetchTeamRequests: async (teamId) => {
      const requestQuery = query(
        collection(db, 'leaveRequests'),
        where('teamId', '==', teamId),
      )

      const snapshot = await getDocs(requestQuery)
      const requests = snapshot.docs.map((docSnapshot) =>
        buildLeaveRequest(docSnapshot.data(), docSnapshot.id),
      )

      return requests.sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
    },
    subscribeTeamRequests: (teamId, onData, onError) => {
      const requestQuery = query(
        collection(db, 'leaveRequests'),
        where('teamId', '==', teamId),
      )

      return onSnapshot(
        requestQuery,
        (snapshot) => {
          const requests = snapshot.docs.map((docSnapshot) =>
            buildLeaveRequest(docSnapshot.data(), docSnapshot.id),
          )
          requests.sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
          onData(requests)
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load requests'))
        },
      )
    },
    subscribeApprovedRequests: (onData, onError) => {
      const requestQuery = query(
        collection(db, 'leaveRequests'),
        where('status', '==', 'APPROVED'),
      )

      return onSnapshot(
        requestQuery,
        (snapshot) => {
          const requests = snapshot.docs.map((docSnapshot) =>
            buildLeaveRequest(docSnapshot.data(), docSnapshot.id),
          )
          requests.sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
          onData(requests)
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load requests'))
        },
      )
    },
    subscribeUserRequests: (employeeUid, onData, onError) => {
      const requestQuery = query(
        collection(db, 'leaveRequests'),
        where('employeeUid', '==', employeeUid),
      )

      return onSnapshot(
        requestQuery,
        (snapshot) => {
          const requests = snapshot.docs.map((docSnapshot) =>
            buildLeaveRequest(docSnapshot.data(), docSnapshot.id),
          )
          requests.sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
          onData(requests)
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load requests'))
        },
      )
    },
    subscribeLeaveLogs: (requestId, onData, onError) => {
      const logsQuery = query(
        collection(db, 'leaveRequests', requestId, 'logs'),
        orderBy('at', 'asc'),
      )

      return onSnapshot(
        logsQuery,
        (snapshot) => {
          const logs = snapshot.docs.map((docSnapshot) =>
            buildLeaveLog(docSnapshot.data(), docSnapshot.id),
          )
          onData(logs)
        },
        (error) => {
          onError?.(error instanceof Error ? error : new Error('Failed to load logs'))
        },
      )
    },
  }
}

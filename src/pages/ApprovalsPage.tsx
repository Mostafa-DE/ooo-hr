import { useMemo, useState } from 'react'

import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTeamRequests } from '@/hooks/useTeamRequests'
import { useTeam } from '@/hooks/useTeam'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useUsersList } from '@/hooks/useUsersList'
import { useToast } from '@/hooks/useToast'
import { formatDateTime, formatDuration } from '@/lib/leave'
import { useRepositories } from '@/lib/useRepositories'
import type { LeaveRequest } from '@/types/leave'
import { approveLeaveRequest } from '@/usecases/approveLeaveRequest'
import { rejectLeaveRequest } from '@/usecases/rejectLeaveRequest'

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  TL_APPROVED: 'TL Approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

function getUserLabel(usersById: Map<string, string>, uid: string) {
  return usersById.get(uid) ?? uid
}

function canApprove(request: LeaveRequest, actorUid: string, teamLeadUid: string | null, managerUid: string | null) {
  if (teamLeadUid === actorUid && request.status === 'SUBMITTED') {
    return request.employeeUid !== teamLeadUid
  }

  if (managerUid === actorUid) {
    if (request.status === 'TL_APPROVED') {
      return true
    }

    if (request.status === 'SUBMITTED' && request.employeeUid === teamLeadUid) {
      return true
    }
  }

  return false
}

function canReject(request: LeaveRequest, actorUid: string, teamLeadUid: string | null, managerUid: string | null) {
  if (teamLeadUid === actorUid && request.status === 'SUBMITTED') {
    return request.employeeUid !== teamLeadUid
  }

  if (managerUid === actorUid) {
    if (request.status === 'TL_APPROVED') {
      return true
    }

    if (request.status === 'SUBMITTED' && request.employeeUid === teamLeadUid) {
      return true
    }
  }

  return false
}

export function ApprovalsPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { team } = useTeam(profile?.teamId ?? null)
  const { requests, loading, error } = useTeamRequests(profile?.teamId ?? null)
  const { users } = useUsersList()
  const { leaveRequestRepository } = useRepositories()
  const toast = useToast()
  const [reasonByRequest, setReasonByRequest] = useState<Record<string, string>>({})
  const [actingId, setActingId] = useState<string | null>(null)

  const usersById = useMemo(() => {
    return new Map(users.map((userProfile) => [userProfile.uid, userProfile.displayName]))
  }, [users])

  const pendingRequests = useMemo(() => {
    if (!user || !team) {
      return []
    }

    const teamLeadUid = team.leadUid
    const managerUid = team.managerUid

    return requests.filter((request) => {
      if (teamLeadUid === user.uid) {
        return request.status === 'SUBMITTED' && request.employeeUid !== user.uid
      }

      if (managerUid === user.uid) {
        if (request.status === 'TL_APPROVED') {
          return true
        }

        if (request.status === 'SUBMITTED' && request.employeeUid === teamLeadUid) {
          return true
        }
      }

      return false
    })
  }, [requests, team, user])

  const historyRequests = useMemo(() => {
    const pendingIds = new Set(pendingRequests.map((request) => request.id))
    return requests.filter((request) => !pendingIds.has(request.id))
  }, [pendingRequests, requests])

  const handleApprove = async (request: LeaveRequest) => {
    if (!user || !team || !leaveRequestRepository) {
      return
    }

    setActingId(request.id)

    try {
      await approveLeaveRequest(
        { leaveRequestRepository },
        { request, team, actorUid: user.uid },
      )
      toast.push({ title: 'Request approved', description: 'Status updated.' })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to approve.'
      toast.push({ title: 'Approval blocked', description: message })
    } finally {
      setActingId(null)
    }
  }

  const handleReject = async (request: LeaveRequest) => {
    if (!user || !team || !leaveRequestRepository) {
      return
    }

    setActingId(request.id)

    const reason = reasonByRequest[request.id]?.trim() || null

    try {
      await rejectLeaveRequest(
        { leaveRequestRepository },
        { request, team, actorUid: user.uid, reason },
      )
      toast.push({ title: 'Request rejected', description: 'Status updated.' })
      setReasonByRequest((current) => ({ ...current, [request.id]: '' }))
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to reject.'
      toast.push({ title: 'Rejection blocked', description: message })
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading approvals...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load approvals.</p>
  }

  if (!team || !user) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">Assign a team to see approvals.</p>
      </section>
    )
  }

  const teamLeadUid = team.leadUid
  const managerUid = team.managerUid
  const isApprover = teamLeadUid === user.uid || managerUid === user.uid

  if (!isApprover) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">
          You are not assigned as a Team Lead or Manager for this team.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">
          Review leave requests pending your decision.
        </p>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              pendingRequests.map((request) => (
                <div key={request.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {getUserLabel(usersById, request.employeeUid)}
                      </div>
                      <div className="text-base font-semibold">
                        {request.type.replace('_', ' ')} ·{' '}
                        {formatDuration(request.requestedMinutes)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(request.startAt)} → {formatDateTime(request.endAt)}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {statusLabels[request.status] ?? request.status}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    <Input
                      placeholder="Optional rejection reason"
                      value={reasonByRequest[request.id] ?? ''}
                      onChange={(event) =>
                        setReasonByRequest((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleReject(request)}
                      disabled={actingId === request.id || !canReject(request, user.uid, teamLeadUid, managerUid)}
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(request)}
                      disabled={actingId === request.id || !canApprove(request, user.uid, teamLeadUid, managerUid)}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div className="space-y-4">
            {historyRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              historyRequests.map((request) => (
                <div key={request.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {getUserLabel(usersById, request.employeeUid)}
                      </div>
                      <div className="text-base font-semibold">
                        {request.type.replace('_', ' ')} ·{' '}
                        {formatDuration(request.requestedMinutes)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(request.startAt)} → {formatDateTime(request.endAt)}
                      </div>
                    </div>
                    <Badge variant={request.status === 'APPROVED' ? 'default' : 'outline'}>
                      {statusLabels[request.status] ?? request.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

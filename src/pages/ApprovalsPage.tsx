import { useMemo, useState } from 'react'

import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTeamRequests } from '@/hooks/useTeamRequests'
import { useTeam } from '@/hooks/useTeam'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAllRequests } from '@/hooks/useAllRequests'
import { useUsersList } from '@/hooks/useUsersList'
import { useTeamsList } from '@/hooks/useTeamsList'
import { useToast } from '@/hooks/useToast'
import { formatDateTime, formatDuration } from '@/lib/leave'
import { useRepositories } from '@/lib/useRepositories'
import type { LeaveRequest } from '@/types/leave'
import { approveLeaveRequest } from '@/usecases/approveLeaveRequest'
import { cancelLeaveRequest } from '@/usecases/cancelLeaveRequest'
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

function canApprove(
  request: LeaveRequest,
  actorUid: string,
  teamLeadUid: string | null,
  managerUid: string | null,
  isAdmin: boolean,
) {
  if (isAdmin) {
    return request.status === 'SUBMITTED' || request.status === 'TL_APPROVED'
  }

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

function canReject(
  request: LeaveRequest,
  actorUid: string,
  teamLeadUid: string | null,
  managerUid: string | null,
  isAdmin: boolean,
) {
  if (isAdmin) {
    return false
  }

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
  const isAdmin = profile?.role === 'admin'
  const { team } = useTeam(isAdmin ? null : profile?.teamId ?? null)
  const teamRequests = useTeamRequests(profile?.teamId ?? null)
  const allRequests = useAllRequests(isAdmin)
  const { requests, loading, error } = isAdmin ? allRequests : teamRequests
  const { users } = useUsersList()
  const { teams } = useTeamsList()
  const { leaveRequestRepository } = useRepositories()
  const toast = useToast()
  const [reasonByRequest, setReasonByRequest] = useState<Record<string, string>>({})
  const [actingId, setActingId] = useState<string | null>(null)

  const usersById = useMemo(() => {
    return new Map(users.map((userProfile) => [userProfile.uid, userProfile.displayName]))
  }, [users])

  const teamsById = useMemo(() => {
    return new Map(teams.map((teamItem) => [teamItem.id, teamItem]))
  }, [teams])

  const pendingRequests = useMemo(() => {
    if (!user) {
      return []
    }

    if (isAdmin) {
      return requests.filter(
        (request) =>
          request.status === 'SUBMITTED' || request.status === 'TL_APPROVED',
      )
    }

    if (!team) {
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
  }, [isAdmin, requests, team, user])

  const historyRequests = useMemo(() => {
    const pendingIds = new Set(pendingRequests.map((request) => request.id))
    return requests.filter((request) => !pendingIds.has(request.id))
  }, [pendingRequests, requests])

  const handleApprove = async (request: LeaveRequest) => {
    if (!user || !leaveRequestRepository) {
      return
    }

    setActingId(request.id)

    try {
      await approveLeaveRequest(
        { leaveRequestRepository },
        {
          request,
          team: isAdmin ? null : team,
          actorUid: user.uid,
          actorRole: profile?.role ?? 'employee',
        },
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

  const handleCancel = async (request: LeaveRequest) => {
    if (!user || !leaveRequestRepository) {
      return
    }

    if (!isAdmin) {
      return
    }

    setActingId(request.id)

    try {
      await cancelLeaveRequest(
        { leaveRequestRepository },
        { request, actorUid: user.uid, actorRole: 'admin', reason: 'Cancelled by admin' },
      )
      toast.push({ title: 'Request cancelled', description: 'Status updated.' })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to cancel.'
      toast.push({ title: 'Cancellation blocked', description: message })
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

  if (!user || (!team && !isAdmin)) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">Assign a team to see approvals.</p>
      </section>
    )
  }

  const teamLeadUid = team?.leadUid ?? null
  const managerUid = team?.managerUid ?? null
  const isApprover = isAdmin || teamLeadUid === user.uid || managerUid === user.uid

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
                      {isAdmin ? (
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Team: {teamsById.get(request.teamId)?.name ?? request.teamId}
                        </div>
                      ) : null}
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
                      disabled={
                        actingId === request.id ||
                        !canReject(request, user.uid, teamLeadUid, managerUid, isAdmin)
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(request)}
                      disabled={
                        actingId === request.id ||
                        !canApprove(request, user.uid, teamLeadUid, managerUid, isAdmin)
                      }
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
                      {isAdmin ? (
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Team: {teamsById.get(request.teamId)?.name ?? request.teamId}
                        </div>
                      ) : null}
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
                  {isAdmin && request.status === 'APPROVED' ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => handleCancel(request)}
                        disabled={actingId === request.id}
                      >
                        Cancel approved request
                      </Button>
                    </div>
                  ) : null}
                  {(request.step1 || request.step2) && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      {request.step1
                        ? `Step 1: ${getUserLabel(usersById, request.step1.byUid)} · ${formatDateTime(request.step1.at)}`
                        : 'Step 1: —'}
                      {' · '}
                      {request.step2
                        ? `Final: ${getUserLabel(usersById, request.step2.byUid)} · ${formatDateTime(request.step2.at)}`
                        : 'Final: —'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

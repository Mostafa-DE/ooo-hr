import { useMemo, useState } from 'react'

import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLeaveLogs } from '@/hooks/useLeaveLogs'
import { useLeaveRequests } from '@/hooks/useLeaveRequests'
import { useLeaveBalanceAdjustments } from '@/hooks/useLeaveBalanceAdjustments'
import { useToast } from '@/hooks/useToast'
import { useUsersList } from '@/hooks/useUsersList'
import { useUserProfile } from '@/hooks/useUserProfile'
import { formatDateTime, formatDuration, formatDurationWithDays } from '@/lib/leave'
import { useRepositories } from '@/lib/useRepositories'
import type { LeaveRequest } from '@/types/leave'
import { cancelLeaveRequest } from '@/usecases/cancelLeaveRequest'

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  TL_APPROVED: 'Team Lead approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

export function MyRequestsPage() {
  const { user } = useAuth()
  const { leaveRequestRepository } = useRepositories()
  const toast = useToast()
  const { profile } = useUserProfile()
  const { requests, loading, error } = useLeaveRequests(user?.uid ?? null)
  const { adjustments } = useLeaveBalanceAdjustments(user?.uid ?? null)
  const [selected, setSelected] = useState<LeaveRequest | null>(null)
  const { logs } = useLeaveLogs(selected?.id ?? null)
  const { users } = useUsersList()
  const [cancelling, setCancelling] = useState(false)

  const sortedRequests = useMemo(() => requests, [requests])
  const userLabelById = useMemo(() => {
    return new Map(users.map((profile) => [profile.uid, profile.displayName]))
  }, [users])

  const formatAdjustmentDelta = (minutes: number) => {
    const label = formatDurationWithDays(Math.abs(minutes))
    return minutes >= 0 ? `+${label}` : `-${label}`
  }

  const formatAdjustmentActor = (uid: string) => {
    if (user && uid === user.uid) {
      return 'You'
    }
    return 'Admin'
  }

  const handleCancel = async (request: LeaveRequest) => {
    if (!user || !leaveRequestRepository) {
      return
    }

    setCancelling(true)
    try {
      await cancelLeaveRequest(
        { leaveRequestRepository },
        {
          request,
          actorUid: user.uid,
          actorRole: profile?.role ?? 'employee',
          reason: null,
        },
      )
      toast.push({
        title: 'Request cancelled',
        description: 'The leave request has been cancelled.',
      })
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unable to cancel request.'
      toast.push({ title: 'Cancellation blocked', description: message })
    } finally {
      setCancelling(false)
    }
  }

  const getUserLabel = (uid: string) => userLabelById.get(uid) ?? uid

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading requests...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load requests.</p>
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My Requests</h1>
        <p className="text-muted-foreground">
          Track your submitted leave requests and their status.
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No requests yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedRequests.map((request) => (
                <TableRow
                  key={request.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(request)}
                >
                  <TableCell className="font-medium">
                    {request.type.replace('_', ' ')}
                  </TableCell>
                  <TableCell>{formatDateTime(request.startAt)}</TableCell>
                  <TableCell>{formatDateTime(request.endAt)}</TableCell>
                  <TableCell>{formatDuration(request.requestedMinutes)}</TableCell>
                  <TableCell>
                    <Badge variant={request.status === 'SUBMITTED' ? 'default' : 'outline'}>
                      {statusLabels[request.status] ?? request.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Balance adjustments</h2>
          <p className="text-xs text-muted-foreground">
            Latest updates to your leave balance.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No balance adjustments yet.
            </p>
          ) : (
            adjustments.slice(0, 8).map((adjustment) => (
              <div key={adjustment.id} className="rounded-md border bg-muted/20 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                  <span>
                    {adjustment.leaveTypeId.replace('_', ' ')} · {adjustment.year}
                  </span>
                  <span>{formatAdjustmentDelta(adjustment.deltaMinutes)}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {adjustment.createdAt ? formatDateTime(adjustment.createdAt) : '—'} ·{' '}
                  {formatAdjustmentActor(adjustment.actorUid)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Reason: {adjustment.reason || '—'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Leave request details</DialogTitle>
                <DialogDescription>
                  {selected.type.replace('_', ' ')} · {statusLabels[selected.status] ?? selected.status}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 text-sm">
                <div>Start: {formatDateTime(selected.startAt)}</div>
                <div>End: {formatDateTime(selected.endAt)}</div>
                <div>Duration: {formatDuration(selected.requestedMinutes)}</div>
                <div>
                  Step 1:{' '}
                  {selected.step1
                    ? `${getUserLabel(selected.step1.byUid)} · ${formatDateTime(selected.step1.at)}`
                    : '—'}
                </div>
                <div>
                  Step 2:{' '}
                  {selected.step2
                    ? `${getUserLabel(selected.step2.byUid)} · ${formatDateTime(selected.step2.at)}`
                    : '—'}
                </div>
                <div>
                  Rejection:{' '}
                  {selected.rejection
                    ? `${getUserLabel(selected.rejection.byUid)} · ${formatDateTime(selected.rejection.at)}`
                    : '—'}
                </div>
                {selected.rejection?.reason ? (
                  <div>Reason: {selected.rejection.reason}</div>
                ) : null}
                <div>Note: {selected.note ?? '—'}</div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <h3 className="text-sm font-semibold">Logs</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {logs.length === 0 ? (
                    <li>No logs yet.</li>
                  ) : (
                    logs.map((log) => {
                      const reason =
                        log.meta && typeof log.meta.reason === 'string'
                          ? log.meta.reason
                          : null

                      return (
                        <li key={log.id}>
                          {log.action} · {getUserLabel(log.actorUid)} · {formatDateTime(log.at)}
                          {reason ? ` · ${reason}` : ''}
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
              <DialogFooter>
                {selected.status === 'SUBMITTED' ||
                selected.status === 'TL_APPROVED' ? (
                  <Button
                    variant="secondary"
                    onClick={() => handleCancel(selected)}
                    disabled={cancelling}
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel request'}
                  </Button>
                ) : null}
                <Button onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

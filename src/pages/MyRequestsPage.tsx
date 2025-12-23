import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/auth/useAuth'
import { LoadingState } from '@/components/LoadingState'
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
  const [selected, setSelected] = useState<LeaveRequest | null>(null)
  const { logs } = useLeaveLogs(selected?.id ?? null)
  const { users } = useUsersList()
  const [cancelling, setCancelling] = useState(false)

  // Filter state for requests table
  const [requestFilterStatus, setRequestFilterStatus] = useState<string | 'all'>('all')
  const [requestFilterType, setRequestFilterType] = useState<string | 'all'>('all')

  // Pagination state for requests table
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Extract available filter options for requests
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>()
    requests.forEach((req) => statuses.add(req.status))
    return Array.from(statuses).sort()
  }, [requests])

  const availableRequestTypes = useMemo(() => {
    const types = new Set<string>()
    requests.forEach((req) => types.add(req.type))
    return Array.from(types).sort()
  }, [requests])

  // Apply filters to requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (requestFilterStatus !== 'all' && request.status !== requestFilterStatus) {
        return false
      }
      if (requestFilterType !== 'all' && request.type !== requestFilterType) {
        return false
      }
      return true
    })
  }, [requests, requestFilterStatus, requestFilterType])

  const sortedRequests = useMemo(() => filteredRequests, [filteredRequests])

  // Calculate pagination
  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex)

  // Reset to page 1 when current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const userLabelById = useMemo(() => {
    return new Map(users.map((profile) => [profile.uid, profile.displayName]))
  }, [users])

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
    return <LoadingState variant="inline" title="Loading requests..." />
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

      {/* Filters for requests table */}
      {requests.length > 0 && (availableStatuses.length > 1 || availableRequestTypes.length > 1) && (
        <div className="rounded-lg border bg-card p-4">
          <div className="space-y-3">
            {/* Status filter */}
            {availableStatuses.length > 1 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Status</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={requestFilterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRequestFilterStatus('all')
                      setCurrentPage(1)
                    }}
                  >
                    All
                  </Button>
                  {availableStatuses.map((status) => (
                    <Button
                      key={status}
                      variant={requestFilterStatus === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setRequestFilterStatus(status)
                        setCurrentPage(1)
                      }}
                    >
                      {statusLabels[status] ?? status}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Type filter */}
            {availableRequestTypes.length > 1 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Type</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={requestFilterType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRequestFilterType('all')
                      setCurrentPage(1)
                    }}
                  >
                    All
                  </Button>
                  {availableRequestTypes.map((type) => (
                    <Button
                      key={type}
                      variant={requestFilterType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setRequestFilterType(type)
                        setCurrentPage(1)
                      }}
                    >
                      {type.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  {requests.length === 0
                    ? 'No requests yet.'
                    : 'No requests match the selected filters.'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((request) => (
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
                  <TableCell>{formatDurationWithDays(request.requestedMinutes)}</TableCell>
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

        {/* Pagination Controls */}
        {sortedRequests.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of{' '}
              {sortedRequests.length} requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)

                  if (!showPage) {
                    // Show ellipsis once between gaps
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-sm text-muted-foreground">
                          ...
                        </span>
                      )
                    }
                    return null
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[2.5rem]"
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
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

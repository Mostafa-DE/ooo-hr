import { useMemo, useState } from 'react'

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
import { useUsersList } from '@/hooks/useUsersList'
import { formatDateTime, formatDurationWithDays } from '@/lib/leave'
import type { LeaveRequest } from '@/types/leave'

type UserLeaveRequestsSectionProps = {
  requests: LeaveRequest[]
  loading: boolean
}

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  TL_APPROVED: 'Team Lead approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

export function UserLeaveRequestsSection({
  requests,
  loading,
}: UserLeaveRequestsSectionProps) {
  const [selected, setSelected] = useState<LeaveRequest | null>(null)
  const { logs } = useLeaveLogs(selected?.id ?? null)
  const { users } = useUsersList()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Sort requests by createdAt descending
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const aTime = a.createdAt?.getTime() ?? 0
      const bTime = b.createdAt?.getTime() ?? 0
      return bTime - aTime
    })
  }, [requests])

  // Calculate pagination
  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage)
  // Ensure currentPage doesn't exceed totalPages
  const safePage = Math.min(currentPage, Math.max(1, totalPages))
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex)

  const userLabelById = useMemo(() => {
    return new Map(users.map((profile) => [profile.uid, profile.displayName]))
  }, [users])

  const getUserLabel = (uid: string) => userLabelById.get(uid) ?? uid

  if (loading) {
    return <LoadingState variant="inline" title="Loading requests..." />
  }

  return (
    <>
      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests found</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((request) => (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(request)}
                      >
                        <TableCell className="font-medium">
                          {request.type.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(request.startAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(request.endAt)}
                        </TableCell>
                        <TableCell>
                          {formatDurationWithDays(request.requestedMinutes)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === 'APPROVED' ? 'default' : 'outline'
                            }
                          >
                            {statusLabels[request.status] ?? request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {request.createdAt
                            ? request.createdAt.toLocaleDateString()
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)}{' '}
                  of {sortedRequests.length} requests
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safePage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= safePage - 1 && page <= safePage + 1)

                      if (!showPage) {
                        // Show ellipsis once between gaps
                        if (page === safePage - 2 || page === safePage + 2) {
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
                          variant={safePage === page ? 'default' : 'outline'}
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
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={safePage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Leave request details</DialogTitle>
                <DialogDescription>
                  {selected.type.replace('_', ' ')} ·{' '}
                  {statusLabels[selected.status] ?? selected.status}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Start:</span>{' '}
                  {formatDateTime(selected.startAt)}
                </div>
                <div>
                  <span className="text-muted-foreground">End:</span>{' '}
                  {formatDateTime(selected.endAt)}
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  {formatDurationWithDays(selected.requestedMinutes)}
                </div>
                <div>
                  <span className="text-muted-foreground">Step 1:</span>{' '}
                  {selected.step1
                    ? `${getUserLabel(selected.step1.byUid)} · ${formatDateTime(selected.step1.at)}`
                    : '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Step 2:</span>{' '}
                  {selected.step2
                    ? `${getUserLabel(selected.step2.byUid)} · ${formatDateTime(selected.step2.at)}`
                    : '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Rejection:</span>{' '}
                  {selected.rejection
                    ? `${getUserLabel(selected.rejection.byUid)} · ${formatDateTime(selected.rejection.at)}`
                    : '—'}
                </div>
                {selected.rejection?.reason ? (
                  <div>
                    <span className="text-muted-foreground">Reason:</span>{' '}
                    {selected.rejection.reason}
                  </div>
                ) : null}
                <div>
                  <span className="text-muted-foreground">Note:</span>{' '}
                  {selected.note ?? '—'}
                </div>
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
                          {log.action} · {getUserLabel(log.actorUid)} ·{' '}
                          {formatDateTime(log.at)}
                          {reason ? ` · ${reason}` : ''}
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
              <DialogFooter>
                <Button onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

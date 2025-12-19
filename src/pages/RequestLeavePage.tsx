import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useTeam } from '@/hooks/useTeam'
import { useToast } from '@/hooks/useToast'
import { computeMinutes, formatDuration } from '@/lib/leave'
import { useRepositories } from '@/lib/useRepositories'
import type { LeaveType } from '@/types/leave'
import { createLeaveRequest } from '@/usecases/createLeaveRequest'

const leaveTypes: LeaveType[] = ['annual', 'sick', 'unpaid', 'other']

export function RequestLeavePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { team } = useTeam(profile?.teamId ?? null)
  const { leaveRequestRepository } = useRepositories()
  const toast = useToast()

  const [type, setType] = useState<LeaveType>('annual')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(() => {
    if (!startAt || !endAt) {
      return null
    }

    const start = new Date(startAt)
    const end = new Date(endAt)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null
    }

    const minutes = computeMinutes(start, end)
    if (minutes <= 0) {
      return null
    }

    return formatDuration(minutes)
  }, [startAt, endAt])

  const handleSubmit = async () => {
    if (!user || !profile || !profile.teamId || !leaveRequestRepository || !team) {
      return
    }

    setError(null)

    const start = new Date(startAt)
    const end = new Date(endAt)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Please provide valid start and end times.')
      return
    }

    setSubmitting(true)

    try {
      await createLeaveRequest(
        { leaveRequestRepository },
        {
          employeeUid: user.uid,
          teamId: profile.teamId,
          teamLeadUid: team.leadUid,
          managerUid: team.managerUid,
          type,
          startAt: start,
          endAt: end,
          note: note.trim() ? note.trim() : null,
        },
      )

      toast.push({
        title: 'Leave request submitted',
        description: 'Your request has been added to My Requests.',
      })
      navigate('/my')
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unable to submit request.'
      setError(message)
      toast.push({ title: 'Request blocked', description: message })
    } finally {
      setSubmitting(false)
    }
  }

  if (!profile?.teamId) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Team required</h1>
        <p className="text-muted-foreground">
          Ask an admin to assign you to a team before creating leave requests.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Request Leave</h1>
        <p className="text-muted-foreground">
          Submit a new leave request for your team.
        </p>
      </div>
      <div className="grid gap-6 rounded-xl border bg-card p-6 text-card-foreground">
        <label className="flex flex-col gap-2 text-sm">
          Leave type
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value as LeaveType)}
          >
            {leaveTypes.map((option) => (
              <option key={option} value={option}>
                {option.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            Start
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            End
            <Input
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
            />
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm">
          Note (optional)
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add context for your manager"
          />
        </label>
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          Duration: {preview ?? '—'}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit request'}
          </Button>
        </div>
      </div>
    </section>
  )
}

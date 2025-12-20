import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLeaveBalances } from '@/hooks/useLeaveBalances'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useTeam } from '@/hooks/useTeam'
import { useToast } from '@/hooks/useToast'
import { computeWorkingMinutes, formatDurationWithDays, isWorkingDay } from '@/lib/leave'
import { useRepositories } from '@/lib/useRepositories'
import type { LeaveType } from '@/types/leave'
import { createLeaveRequest } from '@/usecases/createLeaveRequest'

const leaveTypes: LeaveType[] = ['annual', 'sick', 'unpaid', 'other']

export function RequestLeavePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { team } = useTeam(profile?.teamId ?? null)
  const { leaveRequestRepository, leaveBalanceRepository } = useRepositories()
  const toast = useToast()
  const { balances } = useLeaveBalances(user?.uid ?? null)

  const [type, setType] = useState<LeaveType>('annual')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('17:00')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  const balancesByType = useMemo(() => {
    const map = new Map<LeaveType, number>()
    balances
      .filter((balance) => balance.year === currentYear)
      .forEach((balance) => {
        map.set(balance.leaveTypeId as LeaveType, balance.balanceMinutes)
      })
    return map
  }, [balances, currentYear])

  const toLocalDateValue = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const workingDates = useMemo(() => {
    const dates: { value: string; label: string }[] = []
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    for (let offset = 0; offset <= 120; offset += 1) {
      const candidate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
      if (isWorkingDay(candidate)) {
        const value = toLocalDateValue(candidate)
        const label = candidate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        dates.push({ value, label })
      }
    }
    return dates
  }, [])

  const endDateOptions = useMemo(() => {
    if (!startDate) {
      return workingDates
    }
    return workingDates.filter((date) => date.value >= startDate)
  }, [startDate, workingDates])

  const isMultiDay = Boolean(startDate && endDate && endDate !== startDate)

  useEffect(() => {
    if (isMultiDay) {
      setStartTime('09:00')
      setEndTime('17:00')
    }
  }, [isMultiDay])

  const buildDateTime = (dateValue: string, timeValue: string) => {
    if (!dateValue || !timeValue) {
      return null
    }
    const combined = new Date(`${dateValue}T${timeValue}`)
    return Number.isNaN(combined.getTime()) ? null : combined
  }

  const preview = useMemo(() => {
    const start = buildDateTime(startDate, startTime)
    const end = buildDateTime(endDate, endTime)
    if (!start || !end) {
      return null
    }

    const minutes = computeWorkingMinutes(start, end)
    if (minutes <= 0) {
      return null
    }

    return formatDurationWithDays(minutes)
  }, [endDate, endTime, startDate, startTime])

  const formatBalance = (minutes: number | undefined) => {
    if (minutes === undefined) {
      return '—'
    }
    return formatDurationWithDays(minutes)
  }

  const handleSubmit = async () => {
    if (
      !user ||
      !profile ||
      !profile.teamId ||
      !leaveRequestRepository ||
      !leaveBalanceRepository ||
      !team
    ) {
      return
    }

    setError(null)

    const start = buildDateTime(startDate, startTime)
    const end = buildDateTime(endDate, endTime)

    if (!start || !end) {
      setError('Please provide valid start and end times.')
      return
    }

    setSubmitting(true)

    try {
      await createLeaveRequest(
        { leaveRequestRepository, leaveBalanceRepository },
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
      navigate('/my-requests')
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
          Submit a new leave request for your team (working days only).
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Balance overview ({currentYear})</h2>
          <p className="text-sm text-muted-foreground">Minutes shown as days/hours.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {leaveTypes.map((leaveType) => (
            <div key={leaveType} className="rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {leaveType.replace('_', ' ')}
              </div>
              <div className="mt-1 font-semibold">
                {formatBalance(balancesByType.get(leaveType))}
              </div>
            </div>
          ))}
        </div>
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
          <div className="grid gap-3">
            <label className="flex flex-col gap-2 text-sm">
              Start date
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  if (endDate && event.target.value && endDate < event.target.value) {
                    setEndDate('')
                  }
                }}
              >
                <option value="">Select a working day</option>
                {workingDates.map((date) => (
                  <option key={date.value} value={date.value}>
                    {date.label} ({date.value})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Start time
              <Input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={isMultiDay}
              />
            </label>
          </div>
          <div className="grid gap-3">
            <label className="flex flex-col gap-2 text-sm">
              End date
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              >
                <option value="">Select a working day</option>
                {endDateOptions.map((date) => (
                  <option key={date.value} value={date.value}>
                    {date.label} ({date.value})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              End time
              <Input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={isMultiDay}
              />
            </label>
          </div>
        </div>
        {isMultiDay ? (
          <p className="text-xs text-muted-foreground">
            Times are disabled for multi-day requests and treated as full working days.
          </p>
        ) : null}
        <label className="flex flex-col gap-2 text-sm">
          Note (optional)
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add context for your manager"
          />
        </label>
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          Working duration: {preview ?? '—'}
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

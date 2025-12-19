import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/auth/useAuth'
import { useUsersList } from '@/hooks/useUsersList'
import { useTeamsList } from '@/hooks/useTeamsList'
import { useRepositories } from '@/lib/useRepositories'
import { findTeamLeadConflict } from '@/lib/teams'
import type { LeaveRequest } from '@/types/leave'
import type { UserProfile, UserRole } from '@/types/user'

const roleOptions: UserRole[] = ['employee', 'team_lead', 'manager', 'admin']

function formatTimestamp(value?: { toDate: () => Date }) {
  if (!value) {
    return '—'
  }

  return value.toDate().toLocaleString()
}

type UserRowProps = {
  user: UserProfile
  teamNameById: Map<string, string>
  teamOptions: { id: string; name: string }[]
  users: UserProfile[]
  onSave: (input: {
    uid: string
    isWhitelisted: boolean
    role: UserRole
    teamId: string | null
  }) => Promise<void>
  actorUid: string
  fetchPendingRequests: (uid: string) => Promise<LeaveRequest[]>
  fetchTeamPendingRequests: (teamId: string) => Promise<LeaveRequest[]>
  onCancelPending: (input: { requestId: string; actorUid: string; reason: string }) => Promise<void>
  onUpdateTeamAssignments: (input: {
    previousTeamId: string | null
    nextTeamId: string | null
    uid: string
    role: UserRole
  }) => Promise<void>
}

function UserRow({
  user,
  teamNameById,
  teamOptions,
  users,
  onSave,
  actorUid,
  fetchPendingRequests,
  fetchTeamPendingRequests,
  onCancelPending,
  onUpdateTeamAssignments,
}: UserRowProps) {
  const [isWhitelisted, setIsWhitelisted] = useState(user.isWhitelisted)
  const [role, setRole] = useState<UserRole>(user.role)
  const [teamId, setTeamId] = useState<string | null>(user.teamId)
  const [saving, setSaving] = useState(false)
  const isAdmin = user.role === 'admin'

  const teamLabel = user.teamId ? teamNameById.get(user.teamId) ?? '—' : '—'

  const hasChanges =
    isWhitelisted !== user.isWhitelisted ||
    role !== user.role ||
    (!isAdmin && teamId !== user.teamId)

  const handleSave = async () => {
    const isTeamChange = !isAdmin && teamId !== user.teamId
    const nextTeamId = isAdmin ? user.teamId : teamId
    const roleIsLeadOrManagerNext = role === 'team_lead' || role === 'manager'
    const roleIsLeadOrManagerCurrent =
      user.role === 'team_lead' || user.role === 'manager'

    if (role === 'team_lead' && nextTeamId) {
      const conflict = findTeamLeadConflict(users, nextTeamId, user.uid)
      if (conflict) {
        window.alert('This team already has a team lead assigned.')
        return
      }
    }

    if (roleIsLeadOrManagerCurrent && user.teamId) {
      const teamRequests = await fetchTeamPendingRequests(user.teamId)
      const pending = teamRequests.filter(
        (request) => request.status === 'SUBMITTED' || request.status === 'TL_APPROVED',
      )
      if (pending.length > 0) {
        window.alert(
          'This team has pending requests. Resolve them before changing this team lead/manager.',
        )
        return
      }
    }

    if (roleIsLeadOrManagerNext && nextTeamId) {
      const teamRequests = await fetchTeamPendingRequests(nextTeamId)
      const pending = teamRequests.filter(
        (request) => request.status === 'SUBMITTED' || request.status === 'TL_APPROVED',
      )
      if (pending.length > 0) {
        window.alert(
          'This team has pending requests. Resolve them before assigning a team lead/manager.',
        )
        return
      }
    }

    const needsCancel = isTeamChange && role === 'employee'
    if (needsCancel) {
      const userRequests = await fetchPendingRequests(user.uid)
      const pending = userRequests.filter(
        (request) => request.status === 'SUBMITTED' || request.status === 'TL_APPROVED',
      )

      if (pending.length > 0) {
        const confirmed = window.confirm(
          'This user has pending leave requests. Moving them will cancel those requests. Continue?',
        )
        if (!confirmed) {
          return
        }
      }
    }

    setSaving(true)
    try {
      await onSave({
        uid: user.uid,
        isWhitelisted,
        role,
        teamId: nextTeamId,
      })

      if (needsCancel) {
        const pendingRequests = await fetchPendingRequests(user.uid)
        const toCancel = pendingRequests.filter(
          (request) => request.status === 'SUBMITTED' || request.status === 'TL_APPROVED',
        )
        await Promise.all(
          toCancel.map((request) =>
            onCancelPending({
              requestId: request.id,
              actorUid,
              reason: 'Cancelled due to team change',
            }),
          ),
        )
      }

      await onUpdateTeamAssignments({
        previousTeamId: user.teamId,
        nextTeamId,
        uid: user.uid,
        role,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="font-medium">{user.displayName}</span>
          <span className="text-xs text-muted-foreground">Last login: {formatTimestamp(user.lastLoginAt)}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground">{user.email}</td>
      <td className="px-3 py-3">
        <Badge variant={user.isWhitelisted ? 'default' : 'outline'}>
          {user.isWhitelisted ? 'Whitelisted' : 'Blocked'}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
        >
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {option.replace('_', ' ')}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3 text-sm">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          value={teamId ?? ''}
          onChange={(event) => {
            const value = event.target.value
            setTeamId(value ? value : null)
          }}
          disabled={isAdmin}
        >
          <option value="">Unassigned</option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <div className="text-xs text-muted-foreground">Current: {teamLabel}</div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isWhitelisted}
              onChange={(event) => setIsWhitelisted(event.target.checked)}
            />
            Whitelisted
          </label>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function AdminUsersTab() {
  const { users, loading, error } = useUsersList()
  const { teams } = useTeamsList()
  const { userRepository, teamRepository, leaveRequestRepository } = useRepositories()
  const { user: adminUser } = useAuth()

  const teamNameById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team.name]))
  }, [teams])

  const teamOptions = useMemo(() => {
    return teams.map((team) => ({ id: team.id, name: team.name }))
  }, [teams])

  const teamsById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]))
  }, [teams])

  const updateTeamAssignments = async ({
    previousTeamId,
    nextTeamId,
    uid,
    role,
  }: {
    previousTeamId: string | null
    nextTeamId: string | null
    uid: string
    role: UserRole
  }) => {
    if (!teamRepository) {
      return
    }

    const previousTeam = previousTeamId ? teamsById.get(previousTeamId) : null
    const nextTeam = nextTeamId ? teamsById.get(nextTeamId) : null

    const roleIsLead = role === 'team_lead'
    const roleIsManager = role === 'manager'

    if (previousTeam && previousTeamId !== nextTeamId) {
      if (previousTeam.leadUid === uid) {
        await teamRepository.updateTeamAssignments({
          id: previousTeam.id,
          leadUid: null,
        })
      }
      if (previousTeam.managerUid === uid) {
        await teamRepository.updateTeamAssignments({
          id: previousTeam.id,
          managerUid: null,
        })
      }
    }

    if (nextTeam) {
      if (roleIsLead) {
        await teamRepository.updateTeamAssignments({
          id: nextTeam.id,
          leadUid: uid,
        })
      }

      if (roleIsManager) {
        await teamRepository.updateTeamAssignments({
          id: nextTeam.id,
          managerUid: uid,
        })
      }

      if (!roleIsLead && nextTeam.leadUid === uid) {
        await teamRepository.updateTeamAssignments({
          id: nextTeam.id,
          leadUid: null,
        })
      }

      if (!roleIsManager && nextTeam.managerUid === uid) {
        await teamRepository.updateTeamAssignments({
          id: nextTeam.id,
          managerUid: null,
        })
      }
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading users...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load users.</p>
  }

  if (!userRepository) {
    return <p className="text-sm text-destructive">User repository unavailable.</p>
  }

  if (!teamRepository) {
    return <p className="text-sm text-destructive">Team repository unavailable.</p>
  }

  if (!leaveRequestRepository) {
    return <p className="text-sm text-destructive">Leave repository unavailable.</p>
  }

  if (!adminUser) {
    return <p className="text-sm text-destructive">Admin user unavailable.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          Manage access, roles, and team assignments.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Access</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Team</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((userProfile) => (
              <UserRow
                key={userProfile.uid}
                user={userProfile}
                teamNameById={teamNameById}
                teamOptions={teamOptions}
                users={users}
                onSave={userRepository.updateUserAdmin}
                actorUid={adminUser.uid}
                fetchPendingRequests={leaveRequestRepository.fetchUserRequests}
                fetchTeamPendingRequests={leaveRequestRepository.fetchTeamRequests}
                onCancelPending={leaveRequestRepository.cancelLeaveRequest}
                onUpdateTeamAssignments={updateTeamAssignments}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

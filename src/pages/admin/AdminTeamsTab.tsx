import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useTeamsList } from '@/hooks/useTeamsList'
import { useUsersList } from '@/hooks/useUsersList'
import { findTeamLeadConflict, isDuplicateTeamName } from '@/lib/teams'
import { useRepositories } from '@/lib/useRepositories'
import type { Team } from '@/types/team'
import type { UserProfile } from '@/types/user'

type TeamEditorState = {
  name: string
  leadUid: string | null
  managerUid: string | null
}

function buildUserLabel(user: UserProfile) {
  return user.displayName || user.email || user.uid
}

function TeamEditor({
  team,
  users,
  onCancel,
  onSave,
  error,
}: {
  team: Team
  users: UserProfile[]
  onCancel: () => void
  onSave: (input: TeamEditorState) => Promise<void>
  error: string | null
}) {
  const [formState, setFormState] = useState<TeamEditorState>({
    name: team.name,
    leadUid: team.leadUid,
    managerUid: team.managerUid,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formState)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Team name
          <input
            className="h-9 rounded-md border bg-background px-2"
            value={formState.name}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Team lead
          <select
            className="h-9 rounded-md border bg-background px-2"
            value={formState.leadUid ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setFormState((current) => ({
                ...current,
                leadUid: value ? value : null,
              }))
            }}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.uid} value={user.uid}>
                {buildUserLabel(user)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Manager (optional)
          <select
            className="h-9 rounded-md border bg-background px-2"
            value={formState.managerUid ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setFormState((current) => ({
                ...current,
                managerUid: value ? value : null,
              }))
            }}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.uid} value={user.uid}>
                {buildUserLabel(user)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

type TeamRowProps = {
  team: Team
  users: UserProfile[]
  memberCount: number
  onEdit: (teamId: string) => void
}

function TeamRow({ team, users, memberCount, onEdit }: TeamRowProps) {
  const lead = users.find((user) => user.uid === team.leadUid)
  const manager = users.find((user) => user.uid === team.managerUid)
  const members = users
    .filter((user) => user.teamId === team.id && user.role !== 'admin')
    .map((user) => user.displayName || user.email || '—')

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{team.name}</h3>
          <p className="text-sm text-muted-foreground">
            Lead: {lead ? buildUserLabel(lead) : '—'} · Manager:{' '}
            {manager ? buildUserLabel(manager) : '—'} · Members: {memberCount}
          </p>
          <div className="mt-2 text-sm text-muted-foreground">
            Members:{' '}
            {members.length > 0 ? (
              <span className="inline-flex flex-wrap gap-2">
                {members.map((member) => (
                  <span key={member} className="rounded-md border bg-muted/30 px-2 py-0.5 text-xs">
                    {member}
                  </span>
                ))}
              </span>
            ) : (
              '—'
            )}
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onEdit(team.id)}>
          Edit
        </Button>
      </div>
    </div>
  )
}

export function AdminTeamsTab() {
  const { teams, loading, error } = useTeamsList()
  const { users } = useUsersList()
  const { teamRepository } = useRepositories()
  const [teamName, setTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)

  const membersByTeam = useMemo(() => {
    return users.reduce<Map<string, number>>((map, user) => {
      if (user.teamId) {
        map.set(user.teamId, (map.get(user.teamId) ?? 0) + 1)
      }
      return map
    }, new Map())
  }, [users])

  const eligibleUsers = useMemo(() => {
    return users.filter((user) => user.role !== 'admin')
  }, [users])

  const handleCreateTeam = async () => {
    if (!teamRepository) {
      return
    }

    const name = teamName.trim()
    if (!name) {
      return
    }

    if (isDuplicateTeamName(teams, name)) {
      setTeamError('A team with this name already exists.')
      return
    }

    setCreating(true)
    setTeamError(null)
    try {
      await teamRepository.createTeam({ name })
      setTeamName('')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateTeam = async (team: Team, nextState: TeamEditorState) => {
    if (!teamRepository) {
      return
    }

    if (isDuplicateTeamName(teams, nextState.name, team.id)) {
      setTeamError('A team with this name already exists.')
      return
    }

    const leadUser = users.find((user) => user.uid === nextState.leadUid)
    const managerUser = users.find((user) => user.uid === nextState.managerUid)

    if (nextState.leadUid) {
      const conflict = findTeamLeadConflict(users, team.id, nextState.leadUid)
      if (conflict) {
        setTeamError('This team already has a team lead assigned.')
        return
      }
    }

    if (leadUser?.teamId && leadUser.teamId !== team.id) {
      setTeamError('Selected team lead is assigned to another team.')
      return
    }

    if (managerUser?.teamId && managerUser.teamId !== team.id) {
      setTeamError('Selected manager is assigned to another team.')
      return
    }

    setTeamError(null)
    await teamRepository.updateTeam({
      id: team.id,
      name: nextState.name.trim() || team.name,
      leadUid: nextState.leadUid,
      managerUid: nextState.managerUid,
    })
    setEditingTeamId(null)
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading teams...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load teams.</p>
  }

  if (!teamRepository) {
    return <p className="text-sm text-destructive">Team repository unavailable.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Teams</h2>
        <p className="text-sm text-muted-foreground">
          Create teams and assign leads or managers.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2 text-sm">
            Team name
            <input
              className="h-9 min-w-[240px] rounded-md border bg-background px-2"
              placeholder="Design"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
            />
          </label>
          <Button onClick={handleCreateTeam} disabled={creating || !teamName.trim()}>
            {creating ? 'Creating...' : 'Create team'}
          </Button>
        </div>
        {teamError ? (
          <p className="mt-3 text-sm text-destructive">{teamError}</p>
        ) : null}
      </div>
      <div className="space-y-3">
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams yet.</p>
        ) : (
          teams.map((team) => (
            <div key={team.id}>
              <TeamRow
                team={team}
                users={eligibleUsers}
                memberCount={membersByTeam.get(team.id) ?? 0}
                onEdit={setEditingTeamId}
              />
              {editingTeamId === team.id ? (
                <TeamEditor
                  team={team}
                  users={eligibleUsers.filter(
                    (user) =>
                      user.teamId === null ||
                      user.teamId === team.id ||
                      user.uid === team.leadUid ||
                      user.uid === team.managerUid,
                  )}
                  onCancel={() => setEditingTeamId(null)}
                  onSave={(nextState) => handleUpdateTeam(team, nextState)}
                  error={teamError}
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

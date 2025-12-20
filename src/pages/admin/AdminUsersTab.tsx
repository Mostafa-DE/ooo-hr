import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/auth/useAuth";
import { useUsersList } from "@/hooks/useUsersList";
import { useTeamsList } from "@/hooks/useTeamsList";
import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { useLeaveBalanceAdjustments } from "@/hooks/useLeaveBalanceAdjustments";
import { useToast } from "@/hooks/useToast";
import { useRepositories } from "@/lib/useRepositories";
import { isStaleBalanceYear } from "@/lib/balance";
import { findTeamLeadConflict } from "@/lib/teams";
import type { LeaveRequest } from "@/types/leave";
import type { UserProfile, UserRole } from "@/types/user";
import type { LeaveType } from "@/types/leave";
import { adjustLeaveBalance } from "@/usecases/adjustLeaveBalance";
import { carryoverLeaveBalance } from "@/usecases/carryoverLeaveBalance";

const roleOptions: UserRole[] = ["employee", "team_lead", "manager", "admin"];
const leaveTypeOptions: LeaveType[] = ["annual", "sick", "unpaid", "other"];

function formatTimestamp(value?: { toDate: () => Date }) {
  if (!value) {
    return "—";
  }

  return value.toDate().toLocaleString();
}

type UserRowProps = {
  user: UserProfile;
  teamNameById: Map<string, string>;
  teamOptions: { id: string; name: string }[];
  users: UserProfile[];
  onSave: (input: {
    uid: string;
    isWhitelisted: boolean;
    role: UserRole;
    teamId: string | null;
  }) => Promise<void>;
  actorUid: string;
  fetchPendingRequests: (uid: string) => Promise<LeaveRequest[]>;
  fetchTeamPendingRequests: (teamId: string) => Promise<LeaveRequest[]>;
  onCancelPending: (input: {
    requestId: string;
    actorUid: string;
    reason: string;
  }) => Promise<void>;
  onUpdateTeamAssignments: (input: {
    previousTeamId: string | null;
    nextTeamId: string | null;
    uid: string;
    role: UserRole;
  }) => Promise<void>;
  onOpenBalances: (user: UserProfile) => void;
};

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
  onOpenBalances,
}: UserRowProps) {
  const [isWhitelisted, setIsWhitelisted] = useState(user.isWhitelisted);
  const [role, setRole] = useState<UserRole>(user.role);
  const [teamId, setTeamId] = useState<string | null>(user.teamId);
  const [saving, setSaving] = useState(false);
  const isAdmin = user.role === "admin";

  const teamLabel = user.teamId ? teamNameById.get(user.teamId) ?? "—" : "—";

  const hasChanges =
    isWhitelisted !== user.isWhitelisted ||
    role !== user.role ||
    (!isAdmin && teamId !== user.teamId);

  const handleSave = async () => {
    const isTeamChange = !isAdmin && teamId !== user.teamId;
    const nextTeamId = isAdmin ? user.teamId : teamId;
    const roleIsLeadOrManagerNext = role === "team_lead" || role === "manager";
    const roleIsLeadOrManagerCurrent =
      user.role === "team_lead" || user.role === "manager";

    if (role === "team_lead" && nextTeamId) {
      const conflict = findTeamLeadConflict(users, nextTeamId, user.uid);
      if (conflict) {
        window.alert("This team already has a team lead assigned.");
        return;
      }
    }

    if (roleIsLeadOrManagerCurrent && user.teamId) {
      const teamRequests = await fetchTeamPendingRequests(user.teamId);
      const pending = teamRequests.filter(
        (request) =>
          request.status === "SUBMITTED" || request.status === "TL_APPROVED"
      );
      if (pending.length > 0) {
        window.alert(
          "This team has pending requests. Resolve them before changing this team lead/manager."
        );
        return;
      }
    }

    if (roleIsLeadOrManagerNext && nextTeamId) {
      const teamRequests = await fetchTeamPendingRequests(nextTeamId);
      const pending = teamRequests.filter(
        (request) =>
          request.status === "SUBMITTED" || request.status === "TL_APPROVED"
      );
      if (pending.length > 0) {
        window.alert(
          "This team has pending requests. Resolve them before assigning a team lead/manager."
        );
        return;
      }
    }

    const needsCancel = isTeamChange && role === "employee";
    if (needsCancel) {
      const userRequests = await fetchPendingRequests(user.uid);
      const pending = userRequests.filter(
        (request) =>
          request.status === "SUBMITTED" || request.status === "TL_APPROVED"
      );

      if (pending.length > 0) {
        const confirmed = window.confirm(
          "This user has pending leave requests. Moving them will cancel those requests. Continue?"
        );
        if (!confirmed) {
          return;
        }
      }
    }

    setSaving(true);
    try {
      await onSave({
        uid: user.uid,
        isWhitelisted,
        role,
        teamId: nextTeamId,
      });

      if (needsCancel) {
        const pendingRequests = await fetchPendingRequests(user.uid);
        const toCancel = pendingRequests.filter(
          (request) =>
            request.status === "SUBMITTED" || request.status === "TL_APPROVED"
        );
        await Promise.all(
          toCancel.map((request) =>
            onCancelPending({
              requestId: request.id,
              actorUid,
              reason: "Cancelled due to team change",
            })
          )
        );
      }

      await onUpdateTeamAssignments({
        previousTeamId: user.teamId,
        nextTeamId,
        uid: user.uid,
        role,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="font-medium">{user.displayName}</span>
          <span className="text-xs text-muted-foreground">
            Last login: {formatTimestamp(user.lastLoginAt)}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground">{user.email}</td>
      <td className="px-3 py-3">
        <Badge variant={user.isWhitelisted ? "default" : "outline"}>
          {user.isWhitelisted ? "Whitelisted" : "Blocked"}
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
              {option.replace("_", " ")}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3 text-sm">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          value={teamId ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setTeamId(value ? value : null);
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
        <div className="text-xs text-muted-foreground">
          Current: {teamLabel}
        </div>
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
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenBalances(user)}
          >
            Balances
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function AdminUsersTab() {
  const { users, loading, error } = useUsersList();
  const { teams } = useTeamsList();
  const {
    userRepository,
    teamRepository,
    leaveRequestRepository,
    leaveBalanceRepository,
  } = useRepositories();
  const { user: adminUser } = useAuth();
  const toast = useToast();
  const [balanceUser, setBalanceUser] = useState<UserProfile | null>(null);
  const [balanceType, setBalanceType] = useState<LeaveType>("annual");
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear());
  const [deltaMinutes, setDeltaMinutes] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [carrying, setCarrying] = useState(false);

  const { balances } = useLeaveBalances(balanceUser?.uid ?? null);
  const { adjustments } = useLeaveBalanceAdjustments(balanceUser?.uid ?? null);

  const teamNameById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team.name]));
  }, [teams]);

  const teamOptions = useMemo(() => {
    return teams.map((team) => ({ id: team.id, name: team.name }));
  }, [teams]);

  const teamsById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const updateTeamAssignments = async ({
    previousTeamId,
    nextTeamId,
    uid,
    role,
  }: {
    previousTeamId: string | null;
    nextTeamId: string | null;
    uid: string;
    role: UserRole;
  }) => {
    if (!teamRepository) {
      return;
    }

    const previousTeam = previousTeamId ? teamsById.get(previousTeamId) : null;
    const nextTeam = nextTeamId ? teamsById.get(nextTeamId) : null;

    const roleIsLead = role === "team_lead";
    const roleIsManager = role === "manager";

    if (previousTeam && previousTeamId !== nextTeamId) {
      if (previousTeam.leadUid === uid) {
        await teamRepository.updateTeamAssignments({
          id: previousTeam.id,
          leadUid: null,
        });
      }
      if (previousTeam.managerUid === uid) {
        await teamRepository.updateTeamAssignments({
          id: previousTeam.id,
          managerUid: null,
        });
      }
    }

    if (nextTeam) {
      if (roleIsLead) {
        await teamRepository.updateTeamAssignments({
          id: nextTeam.id,
          leadUid: uid,
        });
      }

      if (roleIsManager) {
        await teamRepository.updateTeamAssignments({
          id: nextTeam.id,
          managerUid: uid,
        });
      }

      if (!roleIsLead && nextTeam.leadUid === uid) {
        await teamRepository.updateTeamAssignments({
          id: nextTeam.id,
          leadUid: null,
        });
      }

      if (!roleIsManager && nextTeam.managerUid === uid) {
        await teamRepository.updateTeamAssignments({
          id: nextTeam.id,
          managerUid: null,
        });
      }
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading users...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load users.</p>;
  }

  if (!userRepository) {
    return (
      <p className="text-sm text-destructive">User repository unavailable.</p>
    );
  }

  if (!teamRepository) {
    return (
      <p className="text-sm text-destructive">Team repository unavailable.</p>
    );
  }

  if (!leaveRequestRepository) {
    return (
      <p className="text-sm text-destructive">Leave repository unavailable.</p>
    );
  }

  if (!leaveBalanceRepository) {
    return (
      <p className="text-sm text-destructive">
        Balance repository unavailable.
      </p>
    );
  }

  if (!adminUser) {
    return <p className="text-sm text-destructive">Admin user unavailable.</p>;
  }

  const currentYear = new Date().getFullYear();
  const hasStaleBalance = balances.some((balance) =>
    isStaleBalanceYear(balance.year, currentYear)
  );

  const selectedBalance = balances.find(
    (balance) =>
      balance.leaveTypeId === balanceType && balance.year === balanceYear
  );

  const formatBalance = (minutes: number | undefined) => {
    if (minutes === undefined) {
      return "—";
    }
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    const days = Math.floor(minutes / 480);
    const parts = [];
    if (days > 0) {
      parts.push(`${days}d`);
    }
    if (hours > 0 || remainder > 0) {
      parts.push(remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`);
    }
    return parts.length > 0 ? parts.join(" · ") : "0m";
  };

  const handleOpenBalances = (user: UserProfile) => {
    setBalanceUser(user);
    setBalanceType("annual");
    setBalanceYear(currentYear);
    setDeltaMinutes("");
    setReason("");
    setReference("");
  };

  const deltaPresets = [
    { label: "Add 30m", value: 30 },
    { label: "Add 1h", value: 60 },
    { label: "Add 2h", value: 120 },
    { label: "Add 4h", value: 240 },
    { label: "Add 1 day (8h)", value: 480 },
    { label: "Add 2 days", value: 960 },
    { label: "Add 3 days", value: 1440 },
    { label: "Remove 30m", value: -30 },
    { label: "Remove 1h", value: -60 },
    { label: "Remove 2h", value: -120 },
    { label: "Remove 4h", value: -240 },
    { label: "Remove 1 day (8h)", value: -480 },
    { label: "Remove 2 days", value: -960 },
    { label: "Remove 3 days", value: -1440 },
  ] as const;

  const handleAdjustBalance = async () => {
    if (!balanceUser || !leaveBalanceRepository) {
      return;
    }

    const parsedDelta = Number.parseInt(deltaMinutes, 10);
    if (Number.isNaN(parsedDelta)) {
      toast.push({
        title: "Adjustment blocked",
        description: "Enter a valid minutes value.",
      });
      return;
    }

    setAdjusting(true);
    try {
      await adjustLeaveBalance(
        { leaveBalanceRepository },
        {
          userId: balanceUser.uid,
          leaveTypeId: balanceType,
          year: balanceYear,
          deltaMinutes: parsedDelta,
          reason,
          reference: reference.trim() ? reference.trim() : null,
          actorUid: adminUser.uid,
        }
      );
      toast.push({
        title: "Balance updated",
        description: "Adjustment saved.",
      });
      setDeltaMinutes("");
      setReason("");
      setReference("");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to adjust balance.";
      toast.push({ title: "Adjustment blocked", description: message });
    } finally {
      setAdjusting(false);
    }
  };

  const handleCarryover = async () => {
    if (!balanceUser || !leaveBalanceRepository) {
      return;
    }

    setCarrying(true);
    try {
      const result = await carryoverLeaveBalance(
        { leaveBalanceRepository },
        {
          userId: balanceUser.uid,
          leaveTypeId: balanceType,
          fromYear: balanceYear - 1,
          toYear: balanceYear,
          actorUid: adminUser.uid,
        }
      );
      if (result.carried) {
        toast.push({
          title: "Carryover complete",
          description: "Balance moved forward.",
        });
      } else {
        toast.push({
          title: "No carryover needed",
          description: "Nothing to move forward.",
        });
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to carry over.";
      toast.push({ title: "Carryover blocked", description: message });
    } finally {
      setCarrying(false);
    }
  };

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
                fetchTeamPendingRequests={
                  leaveRequestRepository.fetchTeamRequests
                }
                onCancelPending={leaveRequestRepository.cancelLeaveRequest}
                onUpdateTeamAssignments={updateTeamAssignments}
                onOpenBalances={handleOpenBalances}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Dialog
        open={Boolean(balanceUser)}
        onOpenChange={(open) => !open && setBalanceUser(null)}
      >
        <DialogContent>
          {balanceUser ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>
                  Balances for {balanceUser.displayName}
                </DialogTitle>
                <DialogDescription>
                  Review yearly balances and add adjustments.
                </DialogDescription>
              </DialogHeader>
              {hasStaleBalance ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  Warning: This user has balances older than two years.
                </div>
              ) : null}
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex flex-col gap-1">
                    Leave type
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                      value={balanceType}
                      onChange={(event) =>
                        setBalanceType(event.target.value as LeaveType)
                      }
                    >
                      {leaveTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    Year
                    <Input
                      type="number"
                      value={balanceYear}
                      onChange={(event) =>
                        setBalanceYear((current) => {
                          const nextYear = Number.parseInt(
                            event.target.value,
                            10
                          );
                          return Number.isNaN(nextYear) ? current : nextYear;
                        })
                      }
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCarryover}
                    disabled={carrying}
                  >
                    {carrying ? "Carrying..." : `Carry from ${balanceYear - 1}`}
                  </Button>
                </div>
                <div className="text-sm">
                  Current balance:{" "}
                  <span className="font-semibold">
                    {formatBalance(selectedBalance?.balanceMinutes)}
                  </span>
                </div>
              </div>
              <div className="grid gap-3">
                <h3 className="text-sm font-semibold">Add adjustment</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Delta minutes
                    <Input
                      type="number"
                      value={deltaMinutes}
                      onChange={(event) => setDeltaMinutes(event.target.value)}
                      placeholder="e.g. -120 or 240"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Quick preset
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                      value=""
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10);
                        if (!Number.isNaN(value)) {
                          setDeltaMinutes(String(value));
                        }
                      }}
                    >
                      <option value="">Select preset</option>
                      {deltaPresets.map((preset) => (
                        <option key={preset.label} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Reference (optional)
                    <Input
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  Reason
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Why is this adjustment needed?"
                  />
                </label>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="font-semibold">Recent adjustments</div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {adjustments.length === 0 ? (
                    <li>No adjustments yet.</li>
                  ) : (
                    adjustments.slice(0, 5).map((adjustment) => (
                      <li key={adjustment.id}>
                        {adjustment.deltaMinutes}m · {adjustment.leaveTypeId} ·{" "}
                        {adjustment.year} · {adjustment.reason}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <DialogFooter>
                <Button onClick={handleAdjustBalance} disabled={adjusting}>
                  {adjusting ? "Saving..." : "Save adjustment"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setBalanceUser(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

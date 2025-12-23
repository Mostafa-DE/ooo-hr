import { useMemo, useState } from "react";

import { useAuth } from "@/auth/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/LoadingState";
import { useTeamRequests } from "@/hooks/useTeamRequests";
import { useTeam } from "@/hooks/useTeam";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAllRequests } from "@/hooks/useAllRequests";
import { useUsersList } from "@/hooks/useUsersList";
import { useTeamsList } from "@/hooks/useTeamsList";
import { useToast } from "@/hooks/useToast";
import { useLeaveBalanceAdjustments } from "@/hooks/useLeaveBalanceAdjustments";
import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { calculateAccrualReference } from "@/lib/accrual";
import {
  formatDateTime,
  formatDuration,
  formatDurationWithDays,
} from "@/lib/leave";
import { useRepositories } from "@/lib/useRepositories";
import type { LeaveRequest, LeaveType } from "@/types/leave";
import type { UserProfile } from "@/types/user";
import { approveLeaveRequest } from "@/usecases/approveLeaveRequest";
import { cancelLeaveRequest } from "@/usecases/cancelLeaveRequest";
import { rejectLeaveRequest } from "@/usecases/rejectLeaveRequest";

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  TL_APPROVED: "TL Approved",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function getUserLabel(usersById: Map<string, string>, uid: string) {
  return usersById.get(uid) ?? uid;
}

function getRequestYear(request: LeaveRequest) {
  return request.year ?? request.startAt.getFullYear();
}

function canApprove(
  request: LeaveRequest,
  actorUid: string,
  teamLeadUid: string | null,
  managerUid: string | null,
  isAdmin: boolean
) {
  if (isAdmin) {
    return request.status === "SUBMITTED" || request.status === "TL_APPROVED";
  }

  if (teamLeadUid === actorUid && request.status === "SUBMITTED") {
    return request.employeeUid !== teamLeadUid;
  }

  if (managerUid === actorUid) {
    if (request.status === "TL_APPROVED") {
      return true;
    }

    if (request.status === "SUBMITTED" && request.employeeUid === teamLeadUid) {
      return true;
    }
  }

  return false;
}

function canReject(
  request: LeaveRequest,
  actorUid: string,
  teamLeadUid: string | null,
  managerUid: string | null,
  isAdmin: boolean
) {
  if (isAdmin) {
    return false;
  }

  if (teamLeadUid === actorUid && request.status === "SUBMITTED") {
    return request.employeeUid !== teamLeadUid;
  }

  if (managerUid === actorUid) {
    if (request.status === "TL_APPROVED") {
      return true;
    }

    if (request.status === "SUBMITTED" && request.employeeUid === teamLeadUid) {
      return true;
    }
  }

  return false;
}

type AccrualPanelProps = {
  request: LeaveRequest;
  userProfile?: UserProfile;
};

type UsageTotals = {
  minutes: number;
  count: number;
};

type UsageSummary = Record<LeaveType, UsageTotals>;

const POLICY_ANNUAL_ENTITLEMENT_DAYS = 15;
const DAILY_MINUTES = 480;
const POLICY_ANNUAL_ENTITLEMENT_MINUTES =
  POLICY_ANNUAL_ENTITLEMENT_DAYS * DAILY_MINUTES;
const LEAVE_TYPES: LeaveType[] = ["annual", "sick", "unpaid", "other"];

function formatSignedMinutes(value: number) {
  if (value === 0) {
    return "0m";
  }

  const label = formatDurationWithDays(Math.abs(value));
  return value < 0 ? `-${label}` : label;
}

function isUsageStatus(status: LeaveRequest["status"]) {
  return status === "APPROVED";
}

function buildUsageSummary(requests: LeaveRequest[], year: number) {
  const summary = new Map<string, UsageSummary>();

  for (const request of requests) {
    if (!isUsageStatus(request.status)) {
      continue;
    }

    if (getRequestYear(request) !== year) {
      continue;
    }

    const existing =
      summary.get(request.employeeUid) ??
      LEAVE_TYPES.reduce<UsageSummary>((accumulator, type) => {
        accumulator[type] = { minutes: 0, count: 0 };
        return accumulator;
      }, {} as UsageSummary);

    const entry = existing[request.type];
    entry.minutes += request.requestedMinutes;
    entry.count += 1;

    summary.set(request.employeeUid, existing);
  }

  return summary;
}

type UsageSummaryPanelProps = {
  userId: string;
  summaryByUser: Map<string, UsageSummary>;
};

function UsageSummaryPanel({ userId, summaryByUser }: UsageSummaryPanelProps) {
  const summary = summaryByUser.get(userId);

  if (!summary) {
    return (
      <div className="mt-3 rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
        Usage summary (current year): no approved leave yet.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Usage summary (current year)
      </div>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {LEAVE_TYPES.map((type) => {
          const totals = summary[type];
          return (
            <div key={type}>
              {type.replace("_", " ")}: {totals.count} request
              {totals.count === 1 ? "" : "s"} ·{" "}
              {formatDurationWithDays(totals.minutes)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccrualPanel({ request, userProfile }: AccrualPanelProps) {
  const { balances } = useLeaveBalances(request.employeeUid);
  const { adjustments } = useLeaveBalanceAdjustments(request.employeeUid);
  const [showFormula, setShowFormula] = useState(false);
  const requestYear = getRequestYear(request);

  if (request.type !== "annual") {
    return null;
  }

  if (!userProfile?.joinDate) {
    return (
      <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
        Join date is not set. Accrual reference is unavailable.
      </div>
    );
  }

  const joinDateValue = userProfile.joinDate.toDate();
  const joinYear = joinDateValue.getFullYear();
  const isJoinYear = requestYear === joinYear;
  const joinMonth = isJoinYear ? joinDateValue.getMonth() + 1 : 1;

  const annualBalance = balances.find(
    (balance) =>
      balance.leaveTypeId === "annual" && balance.year === requestYear
  );

  const adminAdjustmentMinutes = adjustments
    .filter(
      (adjustment) =>
        adjustment.leaveTypeId === "annual" &&
        adjustment.year === requestYear &&
        adjustment.source === "admin"
    )
    .reduce((total, adjustment) => total + adjustment.deltaMinutes, 0);

  if (!annualBalance) {
    return (
      <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        Annual balance is not set for {requestYear}. Accrual reference is
        unavailable.
      </div>
    );
  }

  const currentMonth = new Date().getMonth() + 1;
  const accrual = calculateAccrualReference({
    annualEntitlementMinutes: POLICY_ANNUAL_ENTITLEMENT_MINUTES,
    joinMonth,
    currentMonth,
  });
  const remainingMinutes = annualBalance.balanceMinutes;
  const usedPaidMinutes =
    POLICY_ANNUAL_ENTITLEMENT_MINUTES - remainingMinutes;
  const advanceMinutes = usedPaidMinutes - accrual.entitlementMinutes;

  return (
    <div className="mt-3 rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Annual accrual reference</span>
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold text-muted-foreground hover:bg-muted/40"
          aria-label={showFormula ? "Hide formula" : "Show formula"}
          onClick={() => setShowFormula((current) => !current)}
        >
          ?
        </button>
      </div>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        <div>
          Annual entitlement (policy):{" "}
          {formatDurationWithDays(POLICY_ANNUAL_ENTITLEMENT_MINUTES)}
        </div>
        {isJoinYear ? (
          <div>
            Join date: {joinDateValue.toLocaleDateString()}
          </div>
        ) : null}
        <div>Used paid annual (policy - balance): {formatSignedMinutes(usedPaidMinutes)}</div>
        <div>
          Remaining (current balance): {formatSignedMinutes(remainingMinutes)}
        </div>
        <div>
          Admin adjustments (year): {formatSignedMinutes(adminAdjustmentMinutes)}
        </div>
        <div>
          Monthly rate (policy):{" "}
          {formatDurationWithDays(
            Math.round(POLICY_ANNUAL_ENTITLEMENT_MINUTES / 12)
          )}
        </div>
        <div>
          Earned to date (reference):{" "}
          {formatDurationWithDays(accrual.entitlementMinutes)}
        </div>
      </div>
      {showFormula ? (
        <div className="mt-2 text-xs text-muted-foreground">
          Formula: (policy entitlement ÷ 12) × months since join (
          {accrual.monthsSinceJoin}) · {requestYear}
        </div>
      ) : null}
      {!accrual.isValid ? (
        <div className="mt-2 text-xs text-destructive">
          Join date is after the current month. Verify join date for this year.
        </div>
      ) : advanceMinutes > 0 ? (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
          Advance usage: {formatDurationWithDays(advanceMinutes)}
        </div>
      ) : null}
    </div>
  );
}

export function ApprovalsPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === "admin";
  const { team } = useTeam(isAdmin ? null : profile?.teamId ?? null);
  const teamRequests = useTeamRequests(profile?.teamId ?? null);
  const allRequests = useAllRequests(isAdmin);
  const { requests, loading, error } = isAdmin ? allRequests : teamRequests;
  const { users } = useUsersList();
  const { teams } = useTeamsList();
  const { leaveRequestRepository } = useRepositories();
  const toast = useToast();
  const [reasonByRequest, setReasonByRequest] = useState<
    Record<string, string>
  >({});
  const [actingId, setActingId] = useState<string | null>(null);

  const usersById = useMemo(() => {
    return new Map(
      users.map((userProfile) => [userProfile.uid, userProfile.displayName])
    );
  }, [users]);

  const userProfilesById = useMemo(() => {
    return new Map(users.map((userProfile) => [userProfile.uid, userProfile]));
  }, [users]);

  const teamsById = useMemo(() => {
    return new Map(teams.map((teamItem) => [teamItem.id, teamItem]));
  }, [teams]);

  const usageSummaryByUser = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return buildUsageSummary(requests, currentYear);
  }, [requests]);

  const pendingRequests = useMemo(() => {
    if (!user) {
      return [];
    }

    if (isAdmin) {
      return requests.filter(
        (request) =>
          request.status === "SUBMITTED" || request.status === "TL_APPROVED"
      );
    }

    if (!team) {
      return [];
    }

    const teamLeadUid = team.leadUid;
    const managerUid = team.managerUid;

    return requests.filter((request) => {
      if (teamLeadUid === user.uid) {
        return (
          request.status === "SUBMITTED" && request.employeeUid !== user.uid
        );
      }

      if (managerUid === user.uid) {
        if (request.status === "TL_APPROVED") {
          return true;
        }

        if (
          request.status === "SUBMITTED" &&
          request.employeeUid === teamLeadUid
        ) {
          return true;
        }
      }

      return false;
    });
  }, [isAdmin, requests, team, user]);

  const historyRequests = useMemo(() => {
    const pendingIds = new Set(pendingRequests.map((request) => request.id));
    return requests.filter((request) => !pendingIds.has(request.id));
  }, [pendingRequests, requests]);

  const handleApprove = async (request: LeaveRequest) => {
    if (!user || !leaveRequestRepository) {
      return;
    }

    setActingId(request.id);

    try {
      await approveLeaveRequest(
        { leaveRequestRepository },
        {
          request,
          team: isAdmin ? null : team,
          actorUid: user.uid,
          actorRole: profile?.role ?? "employee",
        }
      );
      toast.push({ title: "Request approved", description: "Status updated." });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to approve.";
      toast.push({ title: "Approval blocked", description: message });
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (request: LeaveRequest) => {
    if (!user || !team || !leaveRequestRepository) {
      return;
    }

    setActingId(request.id);

    const reason = reasonByRequest[request.id]?.trim() || null;

    try {
      await rejectLeaveRequest(
        { leaveRequestRepository },
        { request, team, actorUid: user.uid, reason }
      );
      toast.push({ title: "Request rejected", description: "Status updated." });
      setReasonByRequest((current) => ({ ...current, [request.id]: "" }));
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to reject.";
      toast.push({ title: "Rejection blocked", description: message });
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (request: LeaveRequest) => {
    if (!user || !leaveRequestRepository) {
      return;
    }

    if (!isAdmin) {
      return;
    }

    setActingId(request.id);

    try {
      await cancelLeaveRequest(
        { leaveRequestRepository },
        {
          request,
          actorUid: user.uid,
          actorRole: "admin",
          reason: "Cancelled by admin",
        }
      );
      toast.push({
        title: "Request cancelled",
        description: "Status updated.",
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to cancel.";
      toast.push({ title: "Cancellation blocked", description: message });
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return <LoadingState variant="inline" title="Loading approvals..." />;
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load approvals.</p>
    );
  }

  if (!user || (!team && !isAdmin)) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">Assign a team to see approvals.</p>
      </section>
    );
  }

  const teamLeadUid = team?.leadUid ?? null;
  const managerUid = team?.managerUid ?? null;
  const isApprover =
    isAdmin || teamLeadUid === user.uid || managerUid === user.uid;

  if (!isApprover) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">
          You are not assigned as a Team Lead or Manager for this team.
        </p>
      </section>
    );
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
              <p className="text-sm text-muted-foreground">
                No pending requests.
              </p>
            ) : (
              pendingRequests.map((request) => {
                return (
                  <div key={request.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        {isAdmin ? (
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Team:{" "}
                            {teamsById.get(request.teamId)?.name ??
                              request.teamId}
                          </div>
                        ) : null}
                        <div className="text-sm text-muted-foreground">
                          {getUserLabel(usersById, request.employeeUid)}
                        </div>
                        <div className="text-base font-semibold">
                          {request.type.replace("_", " ")} ·{" "}
                          {formatDuration(request.requestedMinutes)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(request.startAt)} →{" "}
                          {formatDateTime(request.endAt)}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {statusLabels[request.status] ?? request.status}
                      </Badge>
                    </div>
                    <AccrualPanel
                      request={request}
                      userProfile={userProfilesById.get(request.employeeUid)}
                    />
                    <UsageSummaryPanel
                      userId={request.employeeUid}
                      summaryByUser={usageSummaryByUser}
                    />
                    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <Input
                        placeholder="Optional rejection reason"
                        value={reasonByRequest[request.id] ?? ""}
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
                          !canReject(
                            request,
                            user.uid,
                            teamLeadUid,
                            managerUid,
                            isAdmin
                          )
                        }
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleApprove(request)}
                        disabled={
                          actingId === request.id ||
                          !canApprove(
                            request,
                            user.uid,
                            teamLeadUid,
                            managerUid,
                            isAdmin
                          )
                        }
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })
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
                          Team:{" "}
                          {teamsById.get(request.teamId)?.name ??
                            request.teamId}
                        </div>
                      ) : null}
                      <div className="text-sm text-muted-foreground">
                        {getUserLabel(usersById, request.employeeUid)}
                      </div>
                      <div className="text-base font-semibold">
                        {request.type.replace("_", " ")} ·{" "}
                        {formatDuration(request.requestedMinutes)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(request.startAt)} →{" "}
                        {formatDateTime(request.endAt)}
                      </div>
                    </div>
                    <Badge
                      variant={
                        request.status === "APPROVED" ? "default" : "outline"
                      }
                    >
                      {statusLabels[request.status] ?? request.status}
                    </Badge>
                  </div>
                  {isAdmin && request.status === "APPROVED" ? (
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
                  <UsageSummaryPanel
                    userId={request.employeeUid}
                    summaryByUser={usageSummaryByUser}
                  />
                  {(request.step1 || request.step2) && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      {request.step1
                        ? `Step 1: ${getUserLabel(
                            usersById,
                            request.step1.byUid
                          )} · ${formatDateTime(request.step1.at)}`
                        : "Step 1: —"}
                      {" · "}
                      {request.step2
                        ? `Final: ${getUserLabel(
                            usersById,
                            request.step2.byUid
                          )} · ${formatDateTime(request.step2.at)}`
                        : "Final: —"}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

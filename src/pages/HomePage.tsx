import { useMemo } from "react";
import { TeamCalendarWidget } from "@/components/TeamCalendarWidget";
import { useAuth } from "@/auth/useAuth";
import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatDurationWithDays } from "@/lib/leave";
import type { LeaveType } from "@/types/leave";

const leaveTypes: LeaveType[] = ["annual", "sick", "unpaid", "other"];

export function HomePage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { balances } = useLeaveBalances(user?.uid ?? null);
  const showAdminWidget = profile?.role === "admin";
  const showTeamWidget = profile?.role !== "admin" && Boolean(profile?.teamId);

  const currentYear = new Date().getFullYear();
  const balancesByType = useMemo(() => {
    const map = new Map<LeaveType, number>();
    balances
      .filter((balance) => balance.year === currentYear)
      .forEach((balance) => {
        map.set(balance.leaveTypeId as LeaveType, balance.balanceMinutes);
      });
    return map;
  }, [balances, currentYear]);

  const formatBalance = (minutes: number | undefined) => {
    if (minutes === undefined) {
      return "—";
    }
    return formatDurationWithDays(minutes);
  };

  return (
    <div className="space-y-4">
      {user && !showAdminWidget ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Balances {currentYear}
          </span>
          {leaveTypes.map((leaveType) => (
            <div
              key={leaveType}
              className="inline-flex items-center overflow-hidden rounded-md border text-sm"
            >
              <span className="bg-muted px-2 py-1 text-xs font-medium capitalize text-muted-foreground">
                {leaveType.replace("_", " ")}
              </span>
              <span className="px-2 py-1 font-semibold tabular-nums">
                {formatBalance(balancesByType.get(leaveType))}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {showAdminWidget ? (
        <TeamCalendarWidget teamId={null} includeAllTeams />
      ) : null}
      {showTeamWidget && profile?.teamId ? (
        <TeamCalendarWidget teamId={profile.teamId} />
      ) : null}
    </div>
  );
}

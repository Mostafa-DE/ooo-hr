import { type ReactNode } from "react";

import { LoadingState } from "@/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeamCalendar } from "@/hooks/useTeamCalendar";
import {
  addDays,
  clampToDay,
  getMonthWeeks,
  getWeekDays,
  isSameMonth,
} from "@/lib/calendar";
import {
  formatDateRangeWithYear,
  formatDuration,
  formatTimeRange,
  getDisplayEndDate,
  overlaps,
  startOfDay,
  startOfNextWeek,
  startOfTomorrow,
  startOfWeek,
} from "@/lib/leave";
import type { LeaveRequest, LeaveType } from "@/types/leave";

const leaveTypeLabels: Record<LeaveType, string> = {
  annual: "Annual",
  sick: "Sick",
  unpaid: "Unpaid",
  other: "Other",
} as const;

type TeamCalendarWidgetProps = {
  teamId: string | null;
  includeAllTeams?: boolean;
  headerExtra?: ReactNode;
};

export function TeamCalendarWidget({
  teamId,
  includeAllTeams = false,
  headerExtra,
}: TeamCalendarWidgetProps) {
  const { requests, usersById, loading, error } = useTeamCalendar(
    teamId,
    includeAllTeams
  );
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = startOfTomorrow(now);
  const weekStart = startOfWeek(now);
  const nextWeekStart = startOfNextWeek(now);
  const weekDays = getWeekDays(now);
  const monthWeeks = getMonthWeeks(now);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  const weekLeaves = requests.filter((request) =>
    overlaps(request.startAt, request.endAt, weekStart, nextWeekStart)
  );

  const monthLeaves = requests;
  const yearLeaves = requests.filter((request) =>
    overlaps(request.startAt, request.endAt, yearStart, yearEnd)
  );

  const statusMessage = (emptyText: string) => {
    if (loading) {
      return <LoadingState variant="inline" title="Loading team leaves..." />;
    }

    if (error) {
      return (
        <p className="text-sm text-destructive">Failed to load team leaves.</p>
      );
    }

    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  };

  const weekRows = buildLeaveRows(weekLeaves, weekStart, nextWeekStart);
  const todayHighlights = weekLeaves.filter((leave) =>
    overlaps(leave.startAt, leave.endAt, todayStart, tomorrowStart)
  );

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Team Leaves</h2>
          {includeAllTeams ? (
            <Badge variant="secondary">All teams</Badge>
          ) : null}
        </div>
        {headerExtra}
      </div>
      <Tabs defaultValue="week" className="mt-4">
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>
        <TabsContent value="week">
          {weekLeaves.length === 0 ? (
            statusMessage("No approved leaves this week.")
          ) : (
            <div className="space-y-4">
              <CalendarWeekHeader days={weekDays} />
              <CalendarWeekGrid>
                {weekRows.map((row) => (
                  <CalendarLeaveBarRow
                    key={row.id}
                    row={row}
                    usersById={usersById}
                  />
                ))}
              </CalendarWeekGrid>
              {todayHighlights.length > 0 ? (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Today
                  </div>
                  <div className="mt-3 space-y-2">
                    {todayHighlights.map((leave) => (
                      <LeaveMeta
                        key={leave.id}
                        leave={leave}
                        usersById={usersById}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>
        <TabsContent value="month">
          {monthLeaves.length === 0 ? (
            statusMessage("No approved leaves this month.")
          ) : (
            <div className="space-y-6">
              {monthWeeks.map((week) => {
                const weekStartDate = week[0];
                const weekEndDate = addDays(weekStartDate, 7);
                const weekLeavesForMonth = monthLeaves.filter((leave) =>
                  overlaps(
                    leave.startAt,
                    leave.endAt,
                    weekStartDate,
                    weekEndDate
                  )
                );
                const rows = buildLeaveRows(
                  weekLeavesForMonth,
                  weekStartDate,
                  weekEndDate
                );

                return (
                  <div key={weekStartDate.toISOString()} className="space-y-2">
                    <CalendarWeekHeader days={week} mutedMonth={now} />
                    {rows.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No approved leaves.
                      </div>
                    ) : (
                      <CalendarWeekGrid>
                        {rows.map((row) => (
                          <CalendarLeaveBarRow
                            key={row.id}
                            row={row}
                            usersById={usersById}
                          />
                        ))}
                      </CalendarWeekGrid>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="year">
          {yearLeaves.length === 0 ? (
            statusMessage("No approved leaves this year.")
          ) : (
            <div className="space-y-4">
              {(() => {
                const leavesByUser = new Map<string, LeaveRequest[]>();
                for (const leave of yearLeaves) {
                  const existing = leavesByUser.get(leave.employeeUid) ?? [];
                  existing.push(leave);
                  leavesByUser.set(leave.employeeUid, existing);
                }

                const userEntries = Array.from(leavesByUser.entries()).sort((a, b) => {
                  const nameA = usersById[a[0]]?.displayName ?? a[0];
                  const nameB = usersById[b[0]]?.displayName ?? b[0];
                  return nameA.localeCompare(nameB);
                });

                return userEntries.map(([userId, userLeaves]) => {
                  const profile = usersById[userId];
                  return (
                    <div key={userId} className="rounded-lg border bg-background p-4">
                      <div className="space-y-1">
                        <div className="text-base font-semibold">
                          {profile?.displayName ?? "Employee"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {profile?.email ?? "—"}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {userLeaves.map((leave) => (
                          <LeaveMeta
                            key={leave.id}
                            leave={leave}
                            usersById={usersById}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

type LeaveRow = {
  id: string;
  leave: LeaveRequest;
  startIndex: number;
  endIndex: number;
};

function buildLeaveRows(
  leaves: LeaveRequest[],
  windowStart: Date,
  windowEnd: Date
): LeaveRow[] {
  const sorted = [...leaves].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );

  return sorted.map((leave) => {
    const clampedStart =
      leave.startAt > windowStart ? leave.startAt : windowStart;
    const rawEnd = leave.endAt < windowEnd ? leave.endAt : windowEnd;
    const displayEnd = getDisplayEndDate({ ...leave, endAt: rawEnd });
    const startDay = clampToDay(clampedStart);
    const endDay = clampToDay(displayEnd);
    const startIndex = Math.max(
      0,
      Math.min(
        6,
        Math.round((startDay.getTime() - windowStart.getTime()) / 86400000)
      )
    );
    const endIndex = Math.max(
      startIndex,
      Math.min(
        6,
        Math.round((endDay.getTime() - windowStart.getTime()) / 86400000)
      )
    );

    return {
      id: leave.id,
      leave,
      startIndex,
      endIndex,
    };
  });
}

function CalendarWeekHeader({
  days,
  mutedMonth,
}: {
  days: Date[];
  mutedMonth?: Date;
}) {
  const today = startOfDay(new Date());

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="grid grid-cols-7 gap-2 min-w-[600px] sm:min-w-0">
        {days.map((day) => {
          const muted = mutedMonth ? !isSameMonth(day, mutedMonth) : false;
          const isToday = startOfDay(day).getTime() === today.getTime();

          return (
            <div
              key={day.toISOString()}
              className={`rounded-md px-2 py-3 text-center transition-colors ${
                isToday
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50"
              } ${muted ? "opacity-40" : ""}`}
            >
              <div className={`text-xs uppercase tracking-wide ${isToday ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className={`mt-1.5 text-xl ${isToday ? "font-bold" : "font-semibold text-foreground"}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarWeekGrid({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="space-y-2 min-w-[600px] sm:min-w-0">{children}</div>
    </div>
  );
}

function CalendarLeaveBarRow({
  row,
  usersById,
}: {
  row: LeaveRow;
  usersById: Record<string, { displayName: string; email: string }>;
}) {
  const { leave, startIndex, endIndex } = row;
  const profile = usersById[leave.employeeUid];
  const timeLabel = formatTimeRange(leave);
  const durationLabel =
    leave.requestedMinutes > 0 ? formatDuration(leave.requestedMinutes) : null;
  const colorClass = getUserColorClass(leave.employeeUid);
  const columnStyle = {
    gridColumn: `${startIndex + 1} / ${endIndex + 2}`,
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      <div
        className={`rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 ${colorClass}`}
        style={columnStyle}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">
            {profile?.displayName ?? "Employee"}
          </div>
          <Badge variant="secondary" className="text-[10px] h-5">
            {leaveTypeLabels[leave.type]}
          </Badge>
        </div>
        <div className="mt-1.5 break-all text-xs text-muted-foreground">
          {profile?.email ?? "—"}
        </div>
        <div className="mt-2 text-xs">{formatDateRangeWithYear(leave)}</div>
        {(timeLabel || durationLabel) && (
          <div className="mt-1 text-xs text-muted-foreground">
            {timeLabel ? timeLabel : null}
            {timeLabel && durationLabel ? " · " : null}
            {durationLabel ? durationLabel : null}
          </div>
        )}
      </div>
    </div>
  );
}

function LeaveMeta({
  leave,
  usersById,
}: {
  leave: LeaveRequest;
  usersById: Record<string, { displayName: string; email: string }>;
}) {
  const profile = usersById[leave.employeeUid];
  const timeLabel = formatTimeRange(leave);
  const durationLabel =
    leave.requestedMinutes > 0 ? formatDuration(leave.requestedMinutes) : null;
  const colorClass = getUserColorClass(leave.employeeUid);

  return (
    <div
      className={`rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 ${colorClass}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">
          {profile?.displayName ?? "Employee"}
        </div>
        <Badge variant="secondary" className="text-[10px] h-5">
          {leaveTypeLabels[leave.type]}
        </Badge>
      </div>
      <div className="mt-1.5 break-all text-xs text-muted-foreground">
        {profile?.email ?? "—"}
      </div>
      <div className="mt-2 text-xs">
        {formatDateRangeWithYear(leave)}
        {timeLabel ? ` · ${timeLabel}` : ""}
        {durationLabel ? ` · ${durationLabel}` : ""}
      </div>
    </div>
  );
}

const userColorClasses = [
  "bg-amber-50 border-amber-200",
  "bg-emerald-50 border-emerald-200",
  "bg-sky-50 border-sky-200",
  "bg-rose-50 border-rose-200",
  "bg-indigo-50 border-indigo-200",
  "bg-lime-50 border-lime-200",
  "bg-purple-50 border-purple-200",
  "bg-pink-50 border-pink-200",
  "bg-cyan-50 border-cyan-200",
  "bg-orange-50 border-orange-200",
] as const;

function getUserColorClass(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) % 997;
  }
  return userColorClasses[hash % userColorClasses.length];
}

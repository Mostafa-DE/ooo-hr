import type { UserRepository } from "@/lib/userRepository";
import type { TeamRepository } from "@/lib/teamRepository";
import type { EmailRecipient } from "@/types/email";
import type { LeaveRequest } from "@/types/leave";
import { formatDateTime, formatDurationWithDays } from "@/lib/leave";

type FetchRecipientsContext = {
  userRepository: UserRepository;
  teamRepository: TeamRepository;
};

export async function fetchEmployeeRecipient(
  context: FetchRecipientsContext,
  employeeUid: string
): Promise<EmailRecipient | null> {
  try {
    const users = await context.userRepository.fetchUsersByIds([employeeUid]);
    const employee = users[0];

    if (!employee || !employee.email) {
      console.warn(`[EmailHelper] Employee email not found: ${employeeUid}`);
      return null;
    }

    return {
      email: employee.email,
      name: employee.displayName,
    };
  } catch (error) {
    console.error("[EmailHelper] Failed to fetch employee:", error);
    return null;
  }
}

export async function fetchApproverRecipients(
  context: FetchRecipientsContext,
  teamId: string
): Promise<{ teamLead: EmailRecipient | null; manager: EmailRecipient | null }> {
  try {
    // Fetch team to get leadUid and managerUid
    return await new Promise((resolve, reject) => {
      const unsubscribe = context.teamRepository.subscribeTeam(
        teamId,
        async (team) => {
          unsubscribe();

          if (!team) {
            resolve({ teamLead: null, manager: null });
            return;
          }

          const uids = [team.leadUid, team.managerUid].filter(
            (uid): uid is string => uid !== null
          );

          if (uids.length === 0) {
            resolve({ teamLead: null, manager: null });
            return;
          }

          try {
            const users = await context.userRepository.fetchUsersByIds(uids);
            const usersMap = new Map(users.map((u) => [u.uid, u]));

            const teamLead =
              team.leadUid && usersMap.get(team.leadUid)
                ? {
                    email: usersMap.get(team.leadUid)!.email,
                    name: usersMap.get(team.leadUid)!.displayName,
                  }
                : null;

            const manager =
              team.managerUid && usersMap.get(team.managerUid)
                ? {
                    email: usersMap.get(team.managerUid)!.email,
                    name: usersMap.get(team.managerUid)!.displayName,
                  }
                : null;

            resolve({ teamLead, manager });
          } catch (error) {
            console.error("[EmailHelper] Failed to fetch approvers:", error);
            resolve({ teamLead: null, manager: null });
          }
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error("[EmailHelper] Failed in fetchApproverRecipients:", error);
    return { teamLead: null, manager: null };
  }
}

export function formatRequestDates(request: LeaveRequest) {
  return {
    startDate: formatDateTime(request.startAt),
    endDate: formatDateTime(request.endAt),
    duration: formatDurationWithDays(request.requestedMinutes),
  };
}

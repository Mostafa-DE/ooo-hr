export type EmailNotificationType =
  | "REQUEST_CREATED"
  | "TL_APPROVED_WITH_MANAGER"
  | "TL_APPROVED_FINAL"
  | "MANAGER_APPROVED_FINAL"
  | "REQUEST_REJECTED"
  | "REQUEST_CANCELLED";

export type EmailRecipient = {
  email: string;
  name: string;
};

export type EmailNotificationContext = {
  type: EmailNotificationType;
  requestId: string;
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  duration: string;
  startDate: string;
  endDate: string;
  note: string | null;
  approverName?: string;
  approverRole?: "Team Lead" | "Manager";
  approvalDate?: string;
  rejectionReason?: string | null;
  teamLeadApprovalDate?: string | null;
  managerApprovalDate?: string | null;
  recipients: EmailRecipient[];
};

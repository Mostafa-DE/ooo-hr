import type { EmailNotificationContext } from "@/types/email";

type EmailTemplate = {
  subject: string;
  html: string;
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

function formatLeaveType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
}

const baseStyles = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .info-row { margin: 10px 0; padding: 8px; background: white; border-radius: 4px; }
    .label { font-weight: 600; color: #6b7280; }
    .value { color: #111827; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .approval-chain { background: #f0f9ff; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
  </style>
`;

export function generateEmailTemplate(
  context: EmailNotificationContext
): EmailTemplate {
  switch (context.type) {
    case "REQUEST_CREATED":
      return generateRequestCreatedTemplate(context);
    case "TL_APPROVED_WITH_MANAGER":
      return generateTLApprovedWithManagerTemplate(context);
    case "TL_APPROVED_FINAL":
      return generateTLApprovedFinalTemplate(context);
    case "MANAGER_APPROVED_FINAL":
      return generateManagerApprovedFinalTemplate(context);
    case "REQUEST_REJECTED":
      return generateRequestRejectedTemplate(context);
    case "REQUEST_CANCELLED":
      return generateRequestCancelledTemplate(context);
    default:
      throw new Error(`Unknown notification type: ${context.type as string}`);
  }
}

function generateRequestCreatedTemplate(
  context: EmailNotificationContext
): EmailTemplate {
  const { employeeName, leaveType, duration, startDate, endDate, note } =
    context;

  return {
    subject: `New Leave Request - ${employeeName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">New Leave Request</h1>
          </div>
          <div class="content">
            <p><strong>${escapeHtml(employeeName)}</strong> has submitted a new leave request:</p>

            <div class="info-row">
              <span class="label">Leave Type:</span>
              <span class="value">${escapeHtml(formatLeaveType(leaveType))}</span>
            </div>
            <div class="info-row">
              <span class="label">Duration:</span>
              <span class="value">${escapeHtml(duration)}</span>
            </div>
            <div class="info-row">
              <span class="label">Dates:</span>
              <span class="value">${escapeHtml(startDate)} → ${escapeHtml(endDate)}</span>
            </div>
            ${
              note
                ? `
            <div class="info-row">
              <span class="label">Note:</span>
              <span class="value">${escapeHtml(note)}</span>
            </div>
            `
                : ""
            }

            <p><strong>Action Required:</strong> Please review and approve or reject this request.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${import.meta.env.VITE_APP_URL}/approvals" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Request</a>
            </div>
          </div>
          <div class="footer">
            This is an automated notification from OOO Leave Management System.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

function generateTLApprovedWithManagerTemplate(
  context: EmailNotificationContext
): EmailTemplate {
  const {
    employeeName,
    leaveType,
    duration,
    startDate,
    endDate,
    note,
    approverName,
    teamLeadApprovalDate,
  } = context;

  return {
    subject: `Leave Request Pending Your Approval - ${employeeName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Approval Required</h1>
          </div>
          <div class="content">
            <p><strong>${escapeHtml(employeeName)}</strong>'s leave request has been approved by the Team Lead and now requires your final approval:</p>

            <div class="info-row">
              <span class="label">Leave Type:</span>
              <span class="value">${escapeHtml(formatLeaveType(leaveType))}</span>
            </div>
            <div class="info-row">
              <span class="label">Duration:</span>
              <span class="value">${escapeHtml(duration)}</span>
            </div>
            <div class="info-row">
              <span class="label">Dates:</span>
              <span class="value">${escapeHtml(startDate)} → ${escapeHtml(endDate)}</span>
            </div>
            ${
              note
                ? `
            <div class="info-row">
              <span class="label">Note:</span>
              <span class="value">${escapeHtml(note)}</span>
            </div>
            `
                : ""
            }

            <div class="approval-chain">
              <strong>Team Lead Approval:</strong> ${escapeHtml(approverName ?? "Unknown")}
              ${teamLeadApprovalDate ? `(${escapeHtml(teamLeadApprovalDate)})` : ""}
            </div>

            <p><strong>Action Required:</strong> You are the final approver. Please review this request.</p>
          </div>
          <div class="footer">
            This is an automated notification from OOO Leave Management System.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

function generateTLApprovedFinalTemplate(
  context: EmailNotificationContext
): EmailTemplate {
  const { leaveType, duration, startDate, endDate, approverName } = context;

  return {
    subject: "Your Leave Request Has Been Approved",
    html: `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Leave Request Approved ✓</h1>
          </div>
          <div class="content">
            <p>Great news! Your leave request has been approved:</p>

            <div class="info-row">
              <span class="label">Leave Type:</span>
              <span class="value">${escapeHtml(formatLeaveType(leaveType))}</span>
            </div>
            <div class="info-row">
              <span class="label">Duration:</span>
              <span class="value">${escapeHtml(duration)}</span>
            </div>
            <div class="info-row">
              <span class="label">Dates:</span>
              <span class="value">${escapeHtml(startDate)} → ${escapeHtml(endDate)}</span>
            </div>

            <div class="approval-chain">
              <strong>Approved by:</strong> ${escapeHtml(approverName ?? "Unknown")} (Team Lead)<br>
              <strong>Status:</strong> APPROVED (Final)
            </div>

            <p>Your leave has been confirmed and deducted from your balance.</p>
          </div>
          <div class="footer">
            This is an automated notification from OOO Leave Management System.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

function generateManagerApprovedFinalTemplate(
  context: EmailNotificationContext
): EmailTemplate {
  const {
    leaveType,
    duration,
    startDate,
    endDate,
    approverName,
    teamLeadApprovalDate,
    managerApprovalDate,
  } = context;

  return {
    subject: "Your Leave Request Has Been Approved",
    html: `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Leave Request Approved ✓</h1>
          </div>
          <div class="content">
            <p>Great news! Your leave request has been fully approved:</p>

            <div class="info-row">
              <span class="label">Leave Type:</span>
              <span class="value">${escapeHtml(formatLeaveType(leaveType))}</span>
            </div>
            <div class="info-row">
              <span class="label">Duration:</span>
              <span class="value">${escapeHtml(duration)}</span>
            </div>
            <div class="info-row">
              <span class="label">Dates:</span>
              <span class="value">${escapeHtml(startDate)} → ${escapeHtml(endDate)}</span>
            </div>

            <div class="approval-chain">
              <strong>Approval Chain:</strong><br>
              ${teamLeadApprovalDate ? `Team Lead: Approved (${escapeHtml(teamLeadApprovalDate)})<br>` : ""}
              Manager: ${escapeHtml(approverName ?? "Unknown")}
              ${managerApprovalDate ? `(${escapeHtml(managerApprovalDate)})` : ""}<br>
              <strong>Status:</strong> APPROVED (Final)
            </div>

            <p>Your leave has been confirmed and deducted from your balance.</p>
          </div>
          <div class="footer">
            This is an automated notification from OOO Leave Management System.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

function generateRequestRejectedTemplate(
  context: EmailNotificationContext
): EmailTemplate {
  const {
    leaveType,
    duration,
    startDate,
    endDate,
    approverName,
    approverRole,
    rejectionReason,
  } = context;

  return {
    subject: "Your Leave Request Was Not Approved",
    html: `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header" style="background: #dc2626;">
            <h1 style="margin: 0;">Leave Request Declined</h1>
          </div>
          <div class="content">
            <p>Your leave request has been declined:</p>

            <div class="info-row">
              <span class="label">Leave Type:</span>
              <span class="value">${escapeHtml(formatLeaveType(leaveType))}</span>
            </div>
            <div class="info-row">
              <span class="label">Duration:</span>
              <span class="value">${escapeHtml(duration)}</span>
            </div>
            <div class="info-row">
              <span class="label">Dates:</span>
              <span class="value">${escapeHtml(startDate)} → ${escapeHtml(endDate)}</span>
            </div>

            <div class="approval-chain" style="background: #fef2f2; border-left-color: #dc2626;">
              <strong>Rejected by:</strong> ${escapeHtml(approverName ?? "Unknown")}
              ${approverRole ? `(${approverRole})` : ""}<br>
              ${rejectionReason ? `<strong>Reason:</strong> ${escapeHtml(rejectionReason)}` : "<strong>Reason:</strong> No reason provided"}
            </div>

            <p>Your leave balance has not been affected.</p>
            <p>If you have questions, please contact ${escapeHtml(approverName ?? "your manager")} directly.</p>
          </div>
          <div class="footer">
            This is an automated notification from OOO Leave Management System.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

function generateRequestCancelledTemplate(
  context: EmailNotificationContext
): EmailTemplate {
  const { leaveType, duration, startDate, endDate, rejectionReason } = context;

  return {
    subject: "Leave Request Cancelled",
    html: `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header" style="background: #f59e0b;">
            <h1 style="margin: 0;">Leave Request Cancelled</h1>
          </div>
          <div class="content">
            <p>A leave request has been cancelled:</p>

            <div class="info-row">
              <span class="label">Leave Type:</span>
              <span class="value">${escapeHtml(formatLeaveType(leaveType))}</span>
            </div>
            <div class="info-row">
              <span class="label">Duration:</span>
              <span class="value">${escapeHtml(duration)}</span>
            </div>
            <div class="info-row">
              <span class="label">Dates:</span>
              <span class="value">${escapeHtml(startDate)} → ${escapeHtml(endDate)}</span>
            </div>

            ${
              rejectionReason
                ? `
            <div class="approval-chain" style="background: #fef3c7; border-left-color: #f59e0b;">
              <strong>Reason:</strong> ${escapeHtml(rejectionReason)}
            </div>
            `
                : ""
            }

            <p>If this was an approved request, your leave balance has been restored.</p>
          </div>
          <div class="footer">
            This is an automated notification from OOO Leave Management System.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

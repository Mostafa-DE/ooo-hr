import type { EmailNotificationContext } from "@/types/email";
import { generateEmailTemplate } from "@/lib/emailTemplates";

type EmailService = {
  sendNotification: (context: EmailNotificationContext) => Promise<void>;
  isEnabled: () => boolean;
};

type EmailServiceConfig = {
  lambdaUrl: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
};

function createEmailServiceConfig(): EmailServiceConfig {
  return {
    lambdaUrl: import.meta.env.VITE_EMAIL_LAMBDA_URL ?? "",
    apiKey: import.meta.env.VITE_EMAIL_API_KEY ?? "",
    fromEmail:
      import.meta.env.VITE_EMAIL_FROM_EMAIL ?? "",
    fromName: import.meta.env.VITE_EMAIL_FROM_NAME ?? "OOO Leave Management",
    enabled: import.meta.env.VITE_EMAIL_ENABLED === "true",
  };
}

export function createEmailService(): EmailService {
  const config = createEmailServiceConfig();

  // Return disabled service if not configured
  if (!config.enabled || !config.apiKey || !config.lambdaUrl) {
    return {
      sendNotification: async () => {
        console.log("[EmailService] Disabled - skipping notification");
      },
      isEnabled: () => false,
    };
  }

  return {
    sendNotification: async (context: EmailNotificationContext) => {
      try {
        const { subject, html } = generateEmailTemplate(context);

        // Send to all recipients via Lambda proxy
        const promises = context.recipients.map((recipient) =>
          fetch(config.lambdaUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: config.apiKey,
              from: { email: config.fromEmail, name: config.fromName },
              to: [{ email: recipient.email, name: recipient.name }],
              subject,
              html,
            }),
            signal: AbortSignal.timeout(10000), // 10 second timeout
          }).then(async (response) => {
            console.log('====================================');
            console.log("emails sent response", response);
            console.log('====================================');
            if (!response.ok) {
              const errorData = await response
                .json()
                .catch(() => ({ error: "Unknown error" }));
              throw new Error(
                `Lambda error (${response.status}): ${errorData.error || "Unknown"}`
              );
            }
            return response.json();
          })
        );

        await Promise.allSettled(promises);

        console.log(
          `[EmailService] Sent ${context.type} notification to ${context.recipients.length} recipient(s)`
        );
      } catch (error) {
        // Log error but don't throw - emails should never block business operations
        console.error("[EmailService] Failed to send notification:", error);
      }
    },
    isEnabled: () => config.enabled,
  };
}

export const emailService = createEmailService();

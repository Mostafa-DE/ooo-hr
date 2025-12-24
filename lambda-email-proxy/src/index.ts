import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailRequest = {
  apiKey: string;
  from: {
    email: string;
    name: string;
  };
  to: Array<{
    email: string;
    name: string;
  }>;
  subject: string;
  html: string;
};

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing request body',
        }),
      };
    }

    const body: EmailRequest = JSON.parse(event.body);

    // Validate API key
    if (body.apiKey !== process.env.API_KEY) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Unauthorized',
        }),
      };
    }

    // Validate required fields
    if (!body.from || !body.to || !body.subject || !body.html) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields (from, to, subject, html)',
        }),
      };
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: `${body.from.name} <${body.from.email}>`,
      to: body.to.map((recipient) => recipient.email),
      subject: body.subject,
      html: body.html,
    });

    // Handle Resend errors
    if (result.error) {
      console.error('[Lambda] Resend error:', result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to send email',
        }),
      };
    }

    // Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: result.data?.id,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('[Lambda] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
    };
  }
}

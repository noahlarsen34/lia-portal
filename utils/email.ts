import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail =
    process.env.LIA_FROM_EMAIL ??
    "Latinos In Action <no-reply@mail.lia-portal.org>";

type EmailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  idempotencyKey,
} : {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  idempotencyKey?: string;
}) {
  if (!resendApiKey) {
    const error = "RESEND_API_KEY is not configured.";
    console.warn(error);
    return { id: null, error };
  }

  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send(
    {
      from: fromEmail,
      to,
      subject,
      html,
      attachments,
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  );

  if (error) {
    console.error("Resend email failed:", {
      to,
      subject,
      error,
    });

    return {
      id: null,
      error: error.message,
    };
  }

  console.info("Resend email sent:", {
    to,
    subject,
    id: data?.id,
  });

  return {
    id: data?.id ?? null,
    error: null,
  };
}


export function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function renderBrandedEmail({
    preheader,
    eyebrow,
    title,
    body,
}: {
    preheader: string;
    eyebrow: string;
    title: string;
    body: string;
}) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f7f3f4; color:#27272a; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#f7f3f4;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px;">
            <tr>
              <td style="background-color:#c4122f; border-radius:8px 8px 0 0; padding:24px 32px;">
                <p style="margin:0; color:#ffffff; font-size:22px; font-weight:700; line-height:1.2;">
                  LATINOS IN ACTION
                </p>
                <p style="margin:7px 0 0; color:#ffe4e8; font-size:12px; font-weight:700; line-height:1.4; text-transform:uppercase;">
                  Empowering Latino youth through education
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff; border:1px solid #eadfe1; border-top:0; border-radius:0 0 8px 8px; padding:36px 32px 32px;">
                <p style="margin:0 0 10px; color:#c4122f; font-size:12px; font-weight:700; line-height:1.4; text-transform:uppercase;">
                  ${escapeHtml(eyebrow)}
                </p>
                <h1 style="margin:0 0 24px; color:#18181b; font-size:30px; font-weight:700; line-height:1.2;">
                  ${escapeHtml(title)}
                </h1>
                ${body}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin-top:32px; border-top:1px solid #eee7e8;">
                  <tr>
                    <td style="padding-top:24px;">
                      <p style="margin:0; color:#3f3f46; font-size:15px; font-weight:700; line-height:1.5;">
                        Latinos In Action
                      </p>
                      <p style="margin:4px 0 0; color:#71717a; font-size:13px; line-height:1.5;">
                        Leadership. Culture. College and career readiness.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 20px 0;">
                <p style="margin:0; color:#8a7f82; font-size:11px; line-height:1.5;">
                  This is an automated message from the Latinos In Action Portal.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail =
    process.env.LIA_FROM_EMAIL ?? "Latinos In Action <no-reply@lia-portal.org>";

export async function sendEmail({
    to,
    subject,
    html,
} : {
    to: string;
    subject: string;
    html: string;
}) {
    if (!resendApiKey) {
        console.warn("RESEND_API_KEY is not configured. Skipping email.");
        return;
    }

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
    });

    if (error) {
        console.error("Resend email failed:", {
            to,
            subject,
            error,
        });
        return;
    }

    console.info("Resend email sent:", { to, subject, id: data?.id });
}

export function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

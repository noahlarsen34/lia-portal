import "server-only";

import {
    escapeHtml,
    renderBrandedEmail,
    sendEmail,
} from "@/utils/email";
import { EVENT_TIMEZONES } from "./timezones";

export type EventEmailDetails = {
    name: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    timezone: string | null;
    location_name: string | null;
    address: string | null;
};

export type RegistrationEmailDetails = {
    id: string;
    first_name: string;
    student_email: string;
    ticket_number: string;
    ticket_token: string;
};

export type EventEmailType =
    | "reminder"
    | "ticket"
    | "final_reminder";

export function getPortalUrl() {
    const configuredUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.VERCEL_PROJECT_PRODUCTION_URL ??
        process.env.VERCEL_URL ??
        "http://localhost:3000";
    
    const url = /^https?:\/\//i.test(configuredUrl)
        ? configuredUrl
        : `https://${configuredUrl}`;
    
    return url.replace(/\/$/, "");
}

function getTimeZoneLabel(timezone: string | null) {
    return (
        EVENT_TIMEZONES.find(
            (option) => option.value === timezone,
        )?.label ??
        timezone ??
        "Local time"
    );
}

function formatTime(value: string | null) {
    if (!value) {
        return null;
    }

    const [hourText, minuteText] = value.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText ?? "0");

    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    }).format(
        new Date(Date.UTC(2000, 0, 1, hour, minute)),
    );
}

function getDateLabel(event: EventEmailDetails) {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeZone: "UTC",
    }).format(
        new Date(`${event.event_date}T12:00:00Z`),
    );
}

function getTimeLabel(event: EventEmailDetails) {
    const start = formatTime(event.start_time);
    const end = formatTime(event.end_time);

    if (!start) {
        return "Time to be announced";
    }

    return `${start}${end ? ` – ${end}`: ""} (${getTimeZoneLabel(
        event.timezone,
    )})`;
}

function getLocationLabel(event: EventEmailDetails) {
    return (
        [event.location_name, event.address]
            .filter(Boolean)
            .join(" · ") || "Location to be announced"
    );
}

function eventDetails(event: EventEmailDetails) {
    return `
        <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="wifth:100%; margin: 24px 0; background: #f8f8f8; border-left:4px solid #c4122f;
        >
            <tr>
                <td style="padding:20px;">
                    <p style="margin:0 0 10px; color:#18181b; font-size:19px; font-weight:700;">
                        ${escapeHtml(event.name)}
                    </p>

                    <p style="margin:0 0 7px; color:#52525b; font-size:14px; line-height:1.6px;">
                        <strong>Date:</strong>
                        ${escapeHtml(getDateLabel(event))}
                    </p>

                    <p style="margin:0 0 7px; color: #52525b; font-size:14px; line-height:1.6;">
                        <strong>Time</strong>
                        ${escapeHtml(getTimeLabel(event))}
                    </p>

                    <p style="margin:0 0 7px; color #52525b; font-size:14px; line-height:1.6;">
                        <strong>Time</strong>
                        ${escapeHtml(getTimeLabel(event))}
                    </p>

                    <p style="margin:0; color:#52525b; font-size:14px; line-height:1.6;">
                        <strong>Location:</strong>
                        ${escapeHtml(getLocationLabel(event))}
                    </p>
                </td>
            </tr>
        </table>   
    `;       
}

function ticketButton(
    registration: RegistrationEmailDetails,
) {
    const ticketUrl =
        `${getPortalUrl()}/event-ticket/` +
        encodeURIComponent(registration.ticket_token);
    
    return `
        <table
            role="presentation"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="margin:26px 0;"
        >
            <tr>
                <td style="border-radius:7px; background:#c4122f;">
                    <a
                        href="${escapeHtml(ticketUrl)}"
                        style="display:inline-block; padding:14px 22px; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;"
                    >
                        Open your event ticket
                    </a>
                </td>
            </tr>
        </table>

        <p style="margin:0; color:#71717a; font-size:13px; line-height:1.6;">
            Ticket number:
            <strong>${escapeHtml(registration.ticket_number)}</strong>
        </p>
    `;
}

export async function sendEventRegistrationEmail({
    type,
    event,
    registration,
    idempotencyKey,
}: {
    type: EventEmailType;
    event: EventEmailDetails;
    registration: RegistrationEmailDetails;
    idempotencyKey: string;
}) {
    let subject: string;
    let html: string;

    if (type === "ticket") {
        subject = `Your ticket for ${event.name}`;

        html = renderBrandedEmail({
            preheader: `Your ticket for ${event.name} is ready`,
            eyebrow: "Event ticket",
            title: `Your event is one week away, ${registration.first_name}!`,
            body: `
            <p style="margin:0; color: #3f3f46; font-size:16px; line-height:1.7;">
                Your ticket is ready. Open it below and have the
                QR code available when you arrive.
            </p>
            
            ${eventDetails(event)}
            ${ticketButton(registration)}
            `,
        });
    } else if (type === "final_reminder") {
        subject = `Final reminder: ${event.name}`;

        html = renderBrandedEmail({
            preheader: `${event.name} is almost here`,
            eyebrow: "Final event reminder",
            title: `It's almost event time, ${registration.first_name}!`,
            body: `
                <p style="margin:0; color:#3f3f46; font-size:16px; line-height:1.7;">
                    Here are the final event details. Please have
                    your ticket and QR code ready for check-in.
                </p>

                ${eventDetails(event)}
                ${ticketButton(registration)}
            `,
        }); 
    } else {
        subject = `Reminder: ${event.name}`;

        html = renderBrandedEmail({
            preheader: `A reminder about ${event.name}`,
            eyebrow: "Event reminder",
            title: `You're registered, ${registration.first_name}!`,
            body: `
                <p style="margin:0; color:#3f3f46; font-size:16px; line-height:1.7;">
                    This is your two-week reminder for
                    <strong>${escapeHtml(event.name)}</strong>.
                    No action is needed. We will email your ticket
                    one week before the event.
                </p>

                ${eventDetails(event)}
            `,
        });
    }

    const result = await sendEmail({
        to: registration.student_email,
        subject,
        html,
        idempotencyKey,
    });

    return {
        ...result,
        subject,
    };
}
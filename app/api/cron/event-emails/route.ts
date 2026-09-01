import { createAdminClient } from "@/utils/supabase/admin";
import {
    sendEventRegistrationEmail,
    type EventEmailDetails,
    type EventEmailType,
    type RegistrationEmailDetails,
} from "@/utils/event-registration-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

type EventRow = EventEmailDetails & {
    id: string;
};

type RegistrationRow = RegistrationEmailDetails & {
    event_id: string;
    next_reminder_at: string | null;
    ticket_email_status: string | null;
};

function dateNumber(value: string) {
    const [year, month, day] = value
        .split("-")
        .map(Number);
    
    return Date.UTC(year, month - 1, day);
}

function daysUntil(
    eventDate: string,
    currentDate: string,
) {
    return Math.round(
        (dateNumber(eventDate) - dateNumber(currentDate)) /
            DAY_MS,
    );
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;

    if (
        !cronSecret ||
        request.headers.get("authorization") !==
            `Bearer ${cronSecret}`
    ) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    const admin = createAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const today = nowIso.slice(0,10);

    const { data: events, error: eventsError } =
        await admin
            .from("lia_events")
            .select(`
                    id,
                    name,
                    event_date,
                    start_time,
                    end_time,
                    timezone,
                    location_name,
                    address
                `)
            .in("status", ["open", "closed"])
            .gte("event_date", today)
            .order("event_date", {
                ascending: true,
            })
            .limit(100);
    
    if (eventsError) {
        console.error(
            "Event email scheduler could not load events",
            eventsError,
        );

        return Response.json(
            { error: "Could not load events" },
            { status: 500 },
        );
    }

    const eventRows = (events ?? []) as EventRow[];
    const eventMap = new Map(
        eventRows.map((event) => [event.id, event]),
    );

    if (eventRows.length === 0) {
        return Response.json({
            processed: 0,
            sent: 0,
            failed: 0,
        });
    }

    const { data: registrations, error: registrationsError } = await admin
        .from("event_registrations")
        .select(`
                id,
                event_id,
                first_name,
                student_email,
                ticket_number,
                ticket_token,
                next_reminder_at,
                ticket_email_status 
            `)
        .in(
            "event_id",
            eventRows.map((event) => event.id),
        )
        .eq("status", "registered")
        .order("created_at", {
            ascending: true,
        })
        .limit(500);
    
    if (registrationsError) {
        console.error(
            "Event email scheduler could not load registrations",
            registrationsError,
        );

        return Response.json(
            { error: "Could not load registrations" },
            { status: 500 },
        );
    }

    const registrationRows =
        (registrations ?? []) as RegistrationRow[];
    
    const registrationIds = registrationRows.map(
        (registration) => registration.id,
    );

    const sentMilestones = new Set<string>();

    if (registrationIds.length > 0) {
        const { data: logs, error: logsError } = 
            await admin
                .from("event_registration_emails")
                .select(
                    "registration_id, email_type, status",
                )
                .in("registration_id", registrationIds,)
                .in("email_type", [
                    "ticket",
                    "final_reminder"
                ])
                .eq("status", "sent");
        
        if (logsError) {
            console.error(
                "Event email scheduler could not load logs",
                logsError,
            );

            return Response.json(
                { error: "Could not verify email history" },
                { status: 500 },
            );
        }

        for (const log of logs ?? []) {
            sentMilestones.add(
                `${log.registration_id}:${log.email_type}`,
            );
        }
    }

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const registration of registrationRows) {
        const event = eventMap.get(
            registration.event_id,
        );

        if (!event) {
            continue;
        }

        const remianingDays = daysUntil(
            event.event_date,
            today,
        );

        if (remianingDays < 0) {
            continue;
        }

        let emailType: EventEmailType | null = null;

        if (
            remianingDays <= 1 &&
            !sentMilestones.has(
                `${registration.id}:final_reminder`,
            )
        ) {
            emailType = "final_reminder";
        } else if (
            remianingDays <= 7 &&
            registration.ticket_email_status !== "sent" &&
            !sentMilestones.has(
                `${registration.id}:ticket`,
            )
        ) {
            emailType = "ticket";
        } else if (
            remianingDays > 7 &&
            registration.next_reminder_at &&
            registration.next_reminder_at <= nowIso
        ) {
            emailType = "reminder";
        }

        if (!emailType) {
            continue;
        }

        processed += 1;

        /*
         * Claim a biweekly reminder before sending it.
         * This prevents overlapping cron runs from sending it twice.
         */

        if(emailType === "reminder") {
            const followingReminder = new Date(
                now.getTime() + 14 * DAY_MS,
            );

            const followingDate =
                followingReminder
                    .toISOString()
                    .slice(0,10);
            
            const nextReminderAt =
                daysUntil(
                    event.event_date,
                    followingDate,
                ) > 7
                    ? followingReminder.toISOString()
                    : null;
            
            const { data: claimed } = await admin
                .from("event_registrations")
                .update({
                    next_reminder_at: nextReminderAt,
                })
                .eq("id", registration.id)
                .eq(
                    "next_reminder_at",
                    registration.next_reminder_at,
                )
                .select("id")
                .maybeSingle();
                
            if (!claimed) {
                continue;
            }
        }

        if (emailType === "ticket") {
            const { data: claimed } = await admin
                .from("event_registrations")
                .update({
                    ticket_email_status: "processing",
                })
                .eq("id", registration.id)
                .select("id")
                .maybeSingle();
            
            if (!claimed) {
                continue;
            }
        }

        const requestedAt =
            new Date().toISOString();
        
        const sequence = 
            emailType === "reminder"
                ? registration.next_reminder_at?.slice(
                    0,
                    10,
                ) ?? today
                : emailType;
        
        const result =
                await sendEventRegistrationEmail({
                    type: emailType,
                    event,
                    registration,
                    idempotencyKey:
                        `event-${emailType}-` +
                        `${registration.id}-${sequence}`,
                });

        const emailStatus = result.error
                ? "failed"
                : "sent";
        
        const { error: logError } = await admin
            .from("event_registration_emails")
            .insert({
                registration_id: registration.id,
                email_type: emailType,
                recipient:
                    registration.student_email,
                subject: result.subject,
                status: emailStatus,
                requested_at: requestedAt,
                sent_at: result.error
                    ? null
                    : new Date().toISOString(),
                resend_email_id: result.id,
                error_message: result.error,
            });
        
        if (logError) {
            console.error(
                "Could not save automated event email log",
                {
                    registrationId:
                        registration.id,
                    emailType,
                    message: logError.message,
                },
            );
        }

        if (result.error) {
            failed += 1;

            if (emailType === "reminder") {
                await admin
                    .from("event_registrations")
                    .update({
                        next_reminder_at: new Date(
                            now.getTime() + DAY_MS,
                        ).toISOString(),
                    })
                    .eq("id", registration.id);
            }

            if (emailType === "ticket") {
                await admin
                    .from("event_registrations")
                    .update({
                        ticket_email_status: "failed",
                    })
                    .eq("id", registration.id);
            }

            continue;
        }

        sent += 1;

        if (
            emailType === "ticket" ||
            emailType === "final_reminder"
        ) {
            await admin
                .from("event_registrations")
                .update({
                    ticket_email_status: "sent",
                    next_reminder_at: null,
                })
                .eq("id", registration.id);
        }
    }

    return Response.json({
        processed,
        sent,
        failed,
    });
}


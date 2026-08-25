"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

function textValue(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
}

function checkInPath(
    eventId: string,
    values: Record<string, string>,
) {
    const query = new URLSearchParams(values);
    return `/events/${eventId}/check-in?${query.toString()}`;
}

function normalizeTicketInput(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
        return "";
    }

    try {
        const url = new URL(trimmed);
        const segments = url.pathname.split("/").filter(Boolean);

        if (
            segments.length >= 2 &&
            segments.at(-2) === "event-ticket"
        ) {
            return decodeURIComponent(segments.at(-1) ?? "");
        }
    } catch {

    }

    return trimmed;
}

export async function findTicket(
    eventId: string,
    formData: FormData,
) {
    await requireStaff();

    const rawTicket = textValue(formData, "ticket");
    const ticket = normalizeTicketInput(rawTicket);

    if (!ticket) {
        redirect(
            checkInPath(eventId, {
                error: "missing-ticket",
            }),
        );
    }

    const admin = createAdminClient();

    const { data: event, error: eventError } = await admin
        .from("lia_events")
        .select("id")
        .eq("id", eventId)
        .maybeSingle();
    
    if (eventError || !event) {
        redirect("/events?error=not-found");
    }

    let query = admin
        .from("event_registrations")
        .select("id, event_id")
        .eq("event_id", eventId);
    
    query = ticket.toUpperCase().startsWith("LIA-")
        ? query.eq("ticket_number", ticket.toUpperCase())
        : query.eq("ticket_token", ticket);
    
    const { data: registration, error } = 
        await query.maybeSingle();
    
    if (error) {
        console.error("Ticket lookup failed", {
            eventId,
            message: error.message,
        });
        
        redirect(
            checkInPath(eventId, {
                error: "lookup-failed",
            }),
        );
    }

    if (!registration) {
        redirect(
            checkInPath(eventId, {
                error: "invalid-ticket",
                ticket: rawTicket,
            }),
        );
    }

    redirect(
        checkInPath(eventId, {
            registration: registration.id,
        }),
    );
}

export async function checkInRegistration(
    eventId: string,
    registrationId: string,
) {
    const { profile } = await requireStaff();
    const admin = createAdminClient();

    const { data: registration, error: lookUpError } = 
        await admin
            .from("event_registrations")
            .select("id, event_id, status")
            .eq("id", registrationId)
            .eq("event_id", eventId)
            .maybeSingle();
    
    if (lookUpError || !registration) {
        redirect(
            checkInPath(eventId, {
                error: "invalid-ticket",
            }),
        );
    }

    if (registration.status === "withdrawn") {
        redirect(
            checkInPath(eventId, {
                registration: registration.id,
                error: "withdrawn",
            }),
        );
    }

    if (registration.status === "checked_in") {
        redirect(
            checkInPath(eventId, {
                registration: registration.id,
                error: "already-used",
            }),
        );
    }

    if (
        registration.status !== "registered" &&
        registration.status !== "ticket_issued"
    ) {
        redirect(
            checkInPath(eventId, {
                registration: registration.id,
                error: "invalid-status",
            }),
        );
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await admin
        .from("event_registrations")
        .update({
            status_before_check_in: registration.status,
            status: "checked_in",
            checked_in_at: now,
            checked_in_by: profile.id
        })
        .eq("id", registration.id)
        .eq("event_id", eventId)
        .eq("status", registration.status)
        .select("id")
        .maybeSingle();
    
    if (updateError || !updated) {
        redirect(
            checkInPath(eventId, {
                registration: registration.id,
                error: "already-used",
            }),
        );
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/event/${eventId}/check-in`);
    revalidatePath(`/event-ticket`);

    redirect(
        checkInPath(eventId, {
            registration: registration.id,
            success: "checked_in",
        }),
    );
}

export async function undoCheckIn(
    eventId: string,
    registrationId: string,
) {
    await requireStaff();
    const admin = createAdminClient();

    const { data: registration, error: lookUpError } = 
        await admin
            .from("event_registrations")
            .select("id, status, status_before_check_in")
            .eq("id", registrationId)
            .eq("event_id", eventId)
            .maybeSingle();
    
    if (
        lookUpError ||
        !registration ||
        registration.status !== "checked_in"
    ) {
        redirect(
            checkInPath(eventId, {
                error: "not-checked-in",
            }),
        );
    }

    const restoredStatus = 
        registration.status_before_check_in === "registered"
            ? "registered"
            : "ticket_issued";
    
    const { error: updateError } = await admin
        .from("event_registrations")
        .update({
            status: restoredStatus,
            status_before_check_in: null,
            checked_in_at: null,
            checked_in_by: null,
        })
        .eq("id", registrationId)
        .eq("event_id", eventId)
        .eq("status", "checked_in")
    
    if (updateError) {
        console.error("Undo check-in failed", {
            eventId,
            registrationId,
            message: updateError.message,
        });

        redirect(
            checkInPath(eventId, {
                registration:registration.id,
                error: "undo-failed",
            }),
        );
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/check-in`);

    redirect(
        checkInPath(eventId, {
            registration: registration.id,
            success: "undone",
        }),
    );
}

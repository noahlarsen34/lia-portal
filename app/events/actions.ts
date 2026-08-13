"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

type EventStatus =
    | "draft"
    | "open"
    | "closed"
    | "completed"
    | "archived";

const validStatuses = new Set<EventStatus>([
    "draft",
    "open",
    "closed",
    "completed",
    "archived",
]);

export async function setEventStatus(
    eventId: string,
    status: EventStatus,
) {
    const { supabase } = await requireAdmin();

    if (!eventId || !validStatuses.has(status)) {
        redirect("/events?error=invalid-status");
    }

    const { data: event, error: eventLookUpError } =
        await supabase
            .from("lia_events")
            .select("id")
            .eq("id", eventId)
            .maybeSingle();
    
    if (eventLookUpError || !event) {
        redirect("/events?error=not-found");
    }

    const now = new Date().toISOString();

    const { error } = await supabase
        .from("lia_events")
        .update({
            status,
            archived_at:
                status === "archived" ? now : null,
            updated_at: now,
        })
        .eq("id", event.id)
    
    if (error) {
        console.error("Event status update failed", {
            eventId,
            status,
            message: error.message,
        });

        redirect("events?error=status-update-failed");
    }

    revalidatePath("/events");
    revalidatePath(`/events/${eventId}/edit`);
    revalidatePath("/teacher/events");

    if (status === "archived") {
        redirect("/events?archived=true");
    }

    redirect(`/events?statusUpdated=${status}`);
}
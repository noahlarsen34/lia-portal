"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

type EventStatus = "draft" | "open" | "closed" | "completed";

const validStatuses = new Set<EventStatus>([
    "draft",
    "open",
    "closed",
    "completed",
]);

export async function setEventStatus(
    eventId: string,
    status: EventStatus,
) {
    const { supabase } = await requireAdmin();

    if (!eventId || !validStatuses.has(status)) {
        redirect("/events?error=invalid=status");
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

    const { error } = await supabase
        .from("lia_events")
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    
    if (error) {
        console.error("Event status update failed", {
            eventId,
            status,
            message: error.message,
        });

        redirect("/events?error=status-update-failed");
    }

    revalidatePath("/events");
    revalidatePath(`/events/${eventId}/edit`);
    revalidatePath("/teacher/events");

    redirect(`/events?statusUpdated=${status}`);
}
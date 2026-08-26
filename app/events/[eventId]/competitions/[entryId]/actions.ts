"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

function textValue(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
}

function reviewPath(eventId: string, entryId: string) {
    return `/events/${eventId}/competitions/${entryId}`;
}

async function verifyEntry(eventId: string, entryId: string) {
    const admin = createAdminClient();

    const { data: entry, error } = await admin
        .from("event_competition_entries")
        .select("id, registration_id")
        .eq("id", entryId)
        .maybeSingle();
    
    if (error || !entry) {
        if (error) {
            console.error("Competition entry verification failed", {
                eventId,
                entryId,
                message: error.message,
            });
        }

        return null;
    }

    const { data: registration, error: registrationError } =
        await admin
            .from("event_registrations")
            .select("id")
            .eq("id", entry.registration_id)
            .eq("event_id", eventId)
            .maybeSingle();

    if (registrationError || !registration) {
        if (registrationError) {
            console.error("Competition event verification failed", {
                eventId,
                entryId,
                registrationId: entry.registration_id,
                message: registrationError.message,
            });
        }

        return null;
    }

    return entry;
}

export async function saveCompetitionReview(
    eventId: string,
    entryId: string,
    formData: FormData,
) {
    const { profile } = await requireStaff();
    const admin = createAdminClient();

    const entry = await verifyEntry(eventId, entryId);

    if (!entry) {
        redirect(`/events/${eventId}`);
    }

    const rating = Number(textValue(formData, "rating"));
    const privateNotes = textValue(formData, "private_notes");

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        redirect(
            `${reviewPath(eventId, entryId)}?error=invalid-rating`,
        );
    }

    if (privateNotes.length > 10000) {
        redirect(
            `${reviewPath(eventId, entryId)}?error=notes-too-long`,
        );
    }

    const now = new Date().toISOString();

    const { error } = await admin
        .from("event_competition_reviews")
        .upsert(
            {
                competition_entry_id: entryId,
                reviewer_profile_id: profile.id,
                rating,
                private_notes: privateNotes || null,
                updated_at: now,
            },
            {
                onConflict:
                    "competition_entry_id,reviewer_profile_id",
            },
        );
    
    if (error) {
        console.error("Competition review save failed", {
            eventId,
            entryId,
            reviewerId: profile.id,
            message: error.message,
        });

        redirect(
            `${reviewPath(eventId, entryId)}?error=review-failed`,
        );
    }
    
    await admin
        .from("event_competition_entries")
        .update({
            reviewed_at: now,
            updated_at: now,
        })
        .eq("id", entryId);
    
    revalidatePath(`/events/${eventId}`);
    revalidatePath(reviewPath(eventId,entryId));

    redirect(
        `${reviewPath(eventId,entryId)}?saved=review`,
    );
}

export async function saveCompetitionOutcome(
    eventId: string,
    entryId: string,
    formData: FormData,
) {
    await requireStaff();
    const admin = createAdminClient();

    const entry = await verifyEntry(eventId, entryId);

    if (!entry) {
        redirect(`/events/${eventId}`);
    }

    const finalist = formData.get("is_finalist") === "on";
    const winner = formData.get("is_winner") === "on";

    const placementValue = textValue(
        formData,
        "prize_placement",
    );

    const amountValue = textValue(
        formData,
        "prize_amount",
    );

    const placement = placementValue
        ? Number(placementValue)
        : null;
    
    const prizeAmount = amountValue
        ? Number(amountValue)
        : null;
    
    if (
        placement !== null &&
        (!Number.isInteger(placement) || placement < 1)
    ) {
        redirect(
            `${reviewPath(eventId,entryId)}?error=invalid-placement`,
        );
    }

    if (
        prizeAmount !== null &&
        (!Number.isFinite(prizeAmount) || prizeAmount < 0)
    ) {
        redirect(
            `${reviewPath(eventId, entryId)}?error=invalid-prize`,
        );
    }

    if (
        !winner &&
        (placement !== null || prizeAmount !== null)
    ) {
        redirect(
            `${reviewPath(eventId, entryId)}?error=winner-required`,
        );
    }

    const now = new Date().toISOString();

    const { error } = await admin
        .from("event_competition_entries")
        .update({
            is_finalist: finalist || winner,
            is_winner: winner,
            prize_placement: winner ? placement : null,
            prize_amount: winner ? prizeAmount : null,
            reviewed_at: now,
            updated_at: now,
        })
        .eq("id", entryId);
    
    if (error) {
        console.error("Competition outcome save failed", {
            eventId,
            entryId,
            message: error.message,
        });

        redirect(
            `${reviewPath(eventId, entryId)}?error=outcome-failed`,
        );
    }

    revalidatePath(`/events/${eventId}`)
    revalidatePath(reviewPath(eventId, entryId));
    revalidatePath(`/teacher/events/${eventId}`);

    redirect(
        `${reviewPath(eventId, entryId)}?saved=outcome`,
    );
}

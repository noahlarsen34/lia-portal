"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

function redirectWithError(
    eventId: string,
    error: string,
): never {
    redirect(`/events/${eventId}/edit?error=${error}`);
}

export async function updateEvent(
    eventId: string,
    formData: FormData,
) {
    const { supabase } = await requireAdmin();

    const { data: existingEvent, error: lookUpError } =
        await supabase
            .from("lia_events")
            .select("id, status")
            .eq("id", eventId)
            .maybeSingle();
    
    if (lookUpError || !existingEvent) {
        redirect("/events?error=not-found");
    }

    const name = String(formData.get("name") ?? "").trim();
    const description = String(
        formData.get("description") ?? "",
    ).trim();
    const eventDate = String(
        formData.get("event_date") ?? "",
    ).trim();
    const startTime = String(
        formData.get("start_time") ?? "",
    ).trim();
    const endTime = String(
        formData.get("end_time") ?? "",
    ).trim();
    const locationName = String(
        formData.get("location_name") ?? "",
    ).trim();
    const address = String(
        formData.get("address") ?? "",
    ).trim();
    const registrationDeadline = String(
        formData.get("registration_deadline") ?? "",
    );
    const capacityValue = String(
        formData.get("capacity") ?? "",
    ).trim();

    const allSchools =
        formData.get("all_schools") === "on";

    const selectedSchoolIds = Array.from(
        new Set(
            formData
                .getAll("school_ids")
                .map((value) => String(value).trim())
                .filter(Boolean),
        ),
    );

    if (!name || !eventDate || !locationName) {
        redirectWithError(eventId, "missing-fields");
    }

    if (name.length > 200) {
        redirectWithError(eventId, "name-too-long");
    }

    if (description.length > 10000) {
        redirectWithError(eventId, "description-too-long");
    }

    if (startTime && endTime && endTime <= startTime) {
        redirectWithError(eventId, "invalid-time");
    }

    if (
        registrationDeadline &&
        registrationDeadline > eventDate
    ) {
        redirectWithError(eventId, "invalid-deadline");
    }

    let capacity: number | null = null;

    if (capacityValue) {
        capacity = Number(capacityValue);

        if (!Number.isInteger(capacity) || capacity < 1) {
            redirectWithError(eventId, "invalid-capacity");
        }
    }

    if (!allSchools && selectedSchoolIds.length === 0) {
        redirectWithError(eventId, "missing-schools");
    }

    if (!allSchools) {
        const { data: validSchools, error: schoolsError } =
            await supabase
                .from("schools")
                .select("id")
                .in("id", selectedSchoolIds);
        
        if (
            schoolsError ||
            (validSchools ?? []).length !==
                selectedSchoolIds.length
        ) {
            redirectWithError(eventId, "invalid-schools");
        }
    }

    const { error: updateError } = await supabase
        .from("lia_events")
        .update({
            name,
            description: description || null,
            event_date: eventDate,
            start_time: startTime || null,
            end_time: endTime || null,
            location_name: locationName,
            address: address || null,
            registration_deadline:
                registrationDeadline || null,
            capacity,
            all_schools: allSchools,
            updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    
    if (updateError) {
        console.error("Event update failed", {
            eventId,
            message: updateError.message,
        });

        redirectWithError(eventId, "update-failed");
    }

    if (allSchools) {
        const { error: deleteAssignmentsError } =
            await supabase
                .from("lia_event_schools")
                .delete()
                .eq("event_id", eventId);
        
        if (deleteAssignmentsError) {
            redirectWithError(
                eventId,
                "school-assignment-failed",
            );
        } 
    } else {
        const { error: upsertError } = await supabase
            .from("lia_event_schools")
            .upsert(
                selectedSchoolIds.map((schoolId) => ({
                    event_id: eventId,
                    school_id: schoolId,
                })),
                {
                    onConflict: "event_id,school_id",
                    ignoreDuplicates: true,
                },
            );
        
        if (upsertError) {
            redirectWithError(
                eventId,
                "school-assignment-failed",
            );
        }

        const { data: existingAssignments } = await supabase
            .from("lia_event_schools")
            .select("school_id")
            .eq("event_id", eventId);
        
        const selectedSchoolIdSet =
            new Set(selectedSchoolIds);
        
        const removedSchoolIds = (
            existingAssignments ?? []
        )
            .map((assignment) => assignment.school_id)
            .filter(
                (schoolId) =>
                    !selectedSchoolIdSet.has(schoolId)
            );
        
        if (removedSchoolIds.length > 0) {
            const { error: removalError } = await supabase
                .from("lia_event_schools")
                .delete()
                .eq("event_id", eventId)
                .in("school_id", removedSchoolIds);
            
            if (removalError) {
                redirectWithError(
                    eventId,
                    "school-assignment-failed",
                );
            }
        }
    }

    revalidatePath("/events")
    revalidatePath(`/events/${eventId}/edit`);
    revalidatePath("/teacher/events");

    redirect("/events?updated=true");
}
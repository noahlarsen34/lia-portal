"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

function redirectWithError(error: string): never {
    redirect(`/events/new?error=${error}`);
}

export async function createEvent(formData: FormData) {
    const { supabase, profile } = await requireAdmin();

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
    ).trim();
    const capacityValue = String(
        formData.get("capacity") ?? "",
    ).trim();
    const intent = String(
        formData.get("intent") ?? "draft",
    ).trim();

    const allSchools = formData.get("all_schools") === "on";

    const selectedSchoolIds = Array.from(
        new Set(
            formData
                .getAll("school_ids")
                .map((value) => String(value).trim())
                .filter(Boolean),
        ),
    );

    if (!name || !eventDate || !locationName) {
        redirectWithError("missing-fields");
    }

    if (name.length > 200) {
        redirectWithError("name-too-long");
    }

    if (description.length > 10000) {
        redirectWithError("description-too-long");
    }

    if (endTime && startTime && endTime <= startTime) {
        redirectWithError("invalid-time");
    }
    
    if (
        registrationDeadline &&
        registrationDeadline > eventDate
    ) {
        redirectWithError("invalid-deadline");
    }

    let capacity: number | null = null;

    if (capacityValue) {
        capacity = Number(capacityValue);

        if (
            !Number.isInteger(capacity) ||
            capacity < 1
        ) {
            redirectWithError("invalid-capacity");
        }
    }

    if (!allSchools && selectedSchoolIds.length === 0) {
        redirectWithError("missing-schools");
    }

    if (!allSchools) {
        const { data: validSchools, error: schoolError } =
            await supabase
                .from("schools")
                .select('id')
                .in("id", selectedSchoolIds);
        
        if (
            schoolError ||
            (validSchools ?? []).length !==
                selectedSchoolIds.length
        ) {
            redirectWithError("invalid-schools");
        }
    }

    const status = intent === "open" ? "open" : "draft";

    const { data: event, error: eventError } = await supabase
        .from("lia_events")
        .insert({
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
            status,
            all_schools: allSchools,
            created_by: profile.id,
        })
        .select("id")
        .single();
    
    if (eventError || !event) {
        console.error("Event creation failed", {
            adminProfileId: profile.id,
            message: eventError?.message,
        });

        redirectWithError("create-failed");
    }

    if (!allSchools) {
        const eventSchools = selectedSchoolIds.map(
            (schoolId) => ({
                event_id: event.id,
                school_id: schoolId,
            }),
        );

        const { error: eventSchoolsError} = await supabase
            .from("lia_event_schools")
            .insert(eventSchools);
        
        if (eventSchoolsError) {
            console.error("Event school assignment failed", {
                eventId: event.id,
                message: eventSchoolsError.message,
            });

            await supabase
                .from("lia_events")
                .delete()
                .eq("id", event.id);
            
            redirectWithError("school-assignment-failed");
        }
    }

    revalidatePath("/events");
    revalidatePath("/teacher/events");

    redirect(`/events?created=${status}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";
import {
    deleteEventBanner,
    uploadEventBanner,
} from "@/utils/events/upload-event-banner";

const EVENT_TYPES = new Set([
    "conference",
    "bootcamp",
    "mastermind",
]);

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
            .select("id, status, banner_image_url")
            .eq("id", eventId)
            .maybeSingle();
    
    if (lookUpError || !existingEvent) {
        redirect("/events?error=not-found");
    }

    const name = String(formData.get("name") ?? "").trim();
    const description = String(
        formData.get("description") ?? "",
    ).trim();
    const eventType = String(
    formData.get("event_type") ?? "conference",
    ).trim();

    if (!EVENT_TYPES.has(eventType)) {
        redirectWithError(eventId, "invalid-event-type");
    }
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
    const requirements = String(
    formData.get("requirements") ?? "",
    ).trim();

    const agenda = String(
        formData.get("agenda") ?? "",
    ).trim();

    const additionalInstructions = String(
        formData.get("additional_instructions") ?? "",
    ).trim();

    const contactName = String(
        formData.get("contact_name") ?? "",
    ).trim();

    const contactEmail = String(
        formData.get("contact_email") ?? "",
    ).trim();

    const contactPhone = String(
        formData.get("contact_phone") ?? "",
    ).trim();

    const resourceLabel = String(
        formData.get("resource_label") ?? "",
    ).trim();

    const resourceUrl = String(
        formData.get("resource_url") ?? "",
    ).trim();

    const removeBanner =
        formData.get("remove_banner") === "on";

    const bannerValue =
        formData.get("banner_image");

    const bannerFile =
        bannerValue instanceof File &&
        bannerValue.size > 0
            ? bannerValue
            : null;

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

    if (
    requirements.length > 15000 ||
    agenda.length > 15000 ||
    additionalInstructions.length > 15000
    ) {
        redirectWithError(
            eventId,
            "event-content-too-long",
        );
    }

    if (
        contactEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    ) {
        redirectWithError(
            eventId,
            "invalid-contact-email",
        );
    }

    if (
        resourceUrl &&
        !/^https?:\/\//i.test(resourceUrl)
    ) {
        redirectWithError(
            eventId,
            "invalid-resource-url",
        );
    }

    let bannerImageUrl =
        removeBanner
            ? null
            : existingEvent.banner_image_url;

    let newlyUploadedBannerUrl: string | null = null;
    
    if (bannerFile) {
        const bannerUpload =
            await uploadEventBanner(
                eventId,
                bannerFile,
            );
        
        if (bannerUpload.error) {
            redirectWithError(
                eventId,
                bannerUpload.error,
            );
        }

        bannerImageUrl = bannerUpload.url;
        newlyUploadedBannerUrl = bannerUpload.url;
    }

    const { error: updateError } = await supabase
        .from("lia_events")
        .update({
            name,
            event_type: eventType,
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
            banner_image_url: bannerImageUrl,
            requirements: requirements || null,
            agenda: agenda || null,
            additional_instructions:
                additionalInstructions || null,
            contact_name: contactName || null,
            contact_email: contactEmail || null,
            contact_phone: contactPhone || null,
            resource_label: resourceLabel || null,
            resource_url: resourceUrl || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    
    if (updateError) {
        if (newlyUploadedBannerUrl) {
            await deleteEventBanner(
                newlyUploadedBannerUrl,
            );
        }

        console.error("Event update failed", {
            eventId,
            message: updateError.message,
        });

        redirectWithError(eventId, "update-failed");
    }

    if (
        existingEvent.banner_image_url &&
        existingEvent.banner_image_url !== bannerImageUrl
    ) {
        await deleteEventBanner(
            existingEvent.banner_image_url,
        );
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
    revalidatePath(`/teacher/events/${eventId}`);

    redirect("/events?updated=true");
}

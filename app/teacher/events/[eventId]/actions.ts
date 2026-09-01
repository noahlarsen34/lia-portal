"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { create } from "domain";

export async function removeEventRegistration(formData: FormData) {
    const registrationId = String(
        formData.get("registration_id") ?? "",
    ).trim();

    const eventId = String(
        formData.get("event_id") ?? "",
    ).trim();

    if (!registrationId || !eventId) {
        throw new Error("The registratio information is missing.");
    }

    const { profile } = await requireTeacher();

    if (profile.role !== "teacher") {
        throw new Error("You are not authorized to remove this registration.");
    }

    const admin = createAdminClient();

    const { data: teacher, error: teacherError } = await admin
        .from("teachers")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle();
    
    if (teacherError || !teacher) {
        throw new Error("Your teacher record could not be found.");
    }

    const { data: registration, error: registrationError} = await admin
        .from("event_registrations")
        .select('id')
        .eq("id", registrationId)
        .eq('event_id', eventId)
        .eq("teacher_id", teacher.id)
        .neq("status", "withdrawn")
        .maybeSingle();
    
    if (registrationError) {
        console.error("Registration verification failed", {
            registrationId,
            eventId,
            teacherId: teacher.id,
            message: registrationError.message,
        });

        throw new Error("The registration could not be verified.");
    }

    if (!registration) {
        throw new Error(
            "This registration was not ofund or has already been removed.",
        );
    }

    const { error: updateError } = await admin
        .from("event_registrations")
        .update({
            status: "withdrawn",
        })
        .eq("id", registration.id)
        .eq("teacher_id", teacher.id);
    
    if (updateError) {
        console.error("Registration removal failed", {
            registrationId,
            eventId,
            teacherId: teacher.id,
            message: updateError.message
        });

        throw new Error("The student could not be removed.");
    }

    revalidatePath(`/teacher/events/${eventId}`);
}

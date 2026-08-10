"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTeacher(schoolId: string, formData: FormData) {
    const supabase = await createClient();
    const validProgramLevels = new Set([
        "elementary",
        "middle",
        "high",
        "middle_high",
        "k_8",
        "k_12",
        "other",
    ]);

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const requestedProgramLevel = String(
        formData.get("program_level") ?? "",
    ).trim().toLowerCase();
    const programLevel = validProgramLevels.has(requestedProgramLevel)
        ? requestedProgramLevel
        : null;
    const notes = String(formData.get("notes") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const isNewTeacher = formData.get("is_new_teacher") === "on";

    const requestedAssignedRpmId = String(
        formData.get("assigned_rpm_id") ?? "",
    ).trim();

    let assignedRpmId: string | null = null;

    if (requestedAssignedRpmId) {
        const { data: rpmProfile, error: rpmError} = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", requestedAssignedRpmId)
            .in("full_name", [
                "Arthur Lanza",
                "Brayan Zuniga",
                "Deborah Carias",
                "Julie Arocha",
            ])
            .maybeSingle();
        
        if (rpmError || !rpmProfile) {
            redirect(
                `/schools/${schoolId}/teachers/new?error=invalid-rpm`,
            )
        }

        assignedRpmId = rpmProfile.id;
    }

    if (!firstName || !lastName || !email) {
        redirect(`/schools/${schoolId}/teachers/new?error=missing-fields`);
    }

    const { error } = await supabase.from("teachers").insert({
        school_id: schoolId,
        assigned_rpm_id: assignedRpmId,
        first_name: firstName,
        last_name: lastName,
        name,
        email,
        phone: phone || null,
        status: status === "inactive" ? "inactive" : "active",
        username: username || null,
        program_level: programLevel,
        notes: notes || null,
        password_status: "not invited",
        is_new_teacher: isNewTeacher,
    });

    if (error) {
        console.error("Teacher creation failed", {
            schoolId,
            email,
            code: error.code,
            message: error.message,
        });
        redirect(`/schools/${schoolId}/teachers/new?error=create-failed`);
    }

    revalidatePath("/teachers");
    revalidatePath(`/schools/${schoolId}`);

    redirect(`/schools/${schoolId}`);
}

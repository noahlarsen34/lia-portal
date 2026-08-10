"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function updateTeacher(
    schoolId: string,
    teacherId: string,
    formData: FormData,
) {
    const supabase = await createClient();

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const programLevel = String(formData.get("program_level") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const passwordStatus = String(formData.get("password_status") ?? "").trim();
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
                `/schools/${schoolId}/teachers/${teacherId}/edit?error=invalid-rpm`,
            );
        }

        assignedRpmId = rpmProfile.id;
    }

    if (!firstName || !lastName || !email || !status) {
        redirect(
            `/schools/${schoolId}/teachers/${teacherId}/edit?error=missing-fields`
        );
    }

    const { error } = await supabase
        .from("teachers")
        .update({
            first_name: firstName,
            last_name: lastName,
            name,
            email,
            phone: phone || null,
            status,
            username: username || null,
            program_level: programLevel || null,
            notes: notes || null,
            password_status: passwordStatus || "not invited",
            is_new_teacher: isNewTeacher,
            assigned_rpm_id: assignedRpmId,
        })
        .eq("id", teacherId)
        .eq("school_id", schoolId);
    
    if (error) {
        redirect (
            `/schools/${schoolId}/teachers/${teacherId}/edit?error=update-failed`
        );
    }
   redirect(`/schools/${schoolId}`);
    
}

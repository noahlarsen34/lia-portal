"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function updateTeacher(
    schoolId: string,
    teacherId: string,
    formData: FormData,
) {
    const supabase = await createClient();

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const passwordStatus = String(formData.get("password_status") ?? "").trim();
    const isNewTeacher = formData.get("is_new_teacher") === "on";

    if (!name || !email || !status) {
        redirect(
            `/schools/${schoolId}/teachers/${teacherId}/edit?error=missing-fields`
        );
    }

    const { error } = await supabase
        .from("teachers")
        .update({
            name,
            email,
            phone: phone || null,
            status,
            username: username || null,
            password_status: passwordStatus || "not invited",
            is_new_teacher: isNewTeacher,
        })
        .eq("id", teacherId)
        .eq("school_id", schoolId);
    
    if (error) {
        redirect (
            `/schools${schoolId}/teachers/${teacherId}/edit?error=missing-fields`
        );
    }
   redirect(`/schools/${schoolId}`);
    
}
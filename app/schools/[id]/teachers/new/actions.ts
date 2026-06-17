"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function createTeacher(schoolId: string, formData: FormData) {
    const supabase = await createClient();

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const isNewTeacher = formData.get("is_new_teacher") === "on";

    if (!firstName || !lastName || !email) {
        redirect(`/schools/${schoolId}/teachers/new?error=missing-fields`);
    }

    const { error } = await supabase.from("teachers").insert({
        school_id: schoolId,
        first_name: firstName,
        last_name: lastName,
        name,
        email,
        phone: phone || null,
        status: status === "inactive" ? "inactive" : "active",
        username: username || null,
        password_status: "not invited",
        is_new_teacher: isNewTeacher,
    });

    if (error) {
        redirect(`/schools/${schoolId}/teachers/new?error=create-failed`);
    }

    redirect(`/schools/${schoolId}`);
}

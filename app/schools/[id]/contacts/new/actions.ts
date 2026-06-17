"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function createContact(schoolId: string, formData: FormData) {
    const supabase = await createClient();

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const role = String(formData.get("role") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!firstName || !lastName || !role) {
        redirect(`/schools/${schoolId}/contacts/new?error=missing-fields`);
    }

    const { error } = await supabase.from("contacts").insert({
        school_id: schoolId,
        first_name: firstName,
        last_name: lastName,
        name,
        role,
        email: email || null,
        phone: phone || null,
        status: "active",
        notes: notes || null,
    });

    if (error) {
        redirect(`/schools/${schoolId}/contacts/new?error=create-failed`);
    }

    redirect(`/schools/${schoolId}`);
}

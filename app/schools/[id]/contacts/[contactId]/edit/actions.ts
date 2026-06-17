"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function updateContact(
    schoolId:  string,
    contactId: string,
    formData: FormData,
) {
    const supabase = await createClient();

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const role = String(formData.get("role") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!firstName || !lastName || !role || !status) {
        redirect(
            `/schools/${schoolId}/contacts/${contactId}/edit/?error=missing-fields`,
        );
    }

    const { error } = await supabase
        .from("contacts")
        .update({
            first_name: firstName,
            last_name: lastName,
            name,
            role,
            email: email || null,
            phone: phone || null,
            status,
            notes: notes || null,
        })
        .eq("id",contactId)
        .eq("school_id",schoolId);
    
    if (error) {
        redirect(
            `/schools/${schoolId}/contacts/${contactId}/edit/?error=update-failed`,
        );
    }
    redirect(`/schools/${schoolId}`);
}

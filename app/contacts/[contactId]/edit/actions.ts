"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

export async function updateMainContact(
    contactId: string,
    formData: FormData,
) {
    const { supabase } = await requireAdmin("/contacts");

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const role = String(formData.get("role") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const schoolId = String(formData.get("school_id") ?? "").trim();

    if (!firstName || !lastName || !role || !status) {
        redirect(`/contacts/${contactId}/edit?error=missing-fields`);
    }

    const { error } = await supabase
        .from("contacts")
        .update({
            school_id: schoolId || null,
            first_name: firstName,
            last_name: lastName,
            name,
            role,
            email: email || null,
            phone: phone || null,
            status,
            notes: notes || null,
        })
        .eq("id", contactId);

    if (error) {
        redirect(`/contacts/${contactId}/edit?error=update-failed`);
    }

    redirect("/contacts");
}

"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

export async function deleteMainContact(contactId: string) {
    const { supabase } = await requireAdmin("/contacts");

    const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);

    if (error) {
        redirect(`/contacts/${contactId}/delete?error=delete-failed`);
    }

    redirect("/contacts");
}

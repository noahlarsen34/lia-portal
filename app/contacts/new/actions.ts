"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function createGeneralContact(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
    
    if (profile?.role !== "admin") {
        redirect("/contacts?error=not-authorized");
    }

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const role = String(formData.get("role") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const schoolId = String(formData.get("school_id") ?? "").trim();

    if (!firstName || !lastName || !role) {
        redirect("/contacts/new?error=missing-fields");
    }

    const { error } = await supabase.from("contacts").insert({
        school_id: schoolId || null,
        first_name: firstName,
        last_name: lastName,
        name,
        role,
        email: email || null,
        phone: phone || null,
        status,
        notes: notes || null,
    });

    if (error) {
        redirect("/contacts/new?error=create-failed");
    }

    redirect("/contacts");

} 
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { last } from "pdf-lib";

export async function updateTeacherProfile(formData: FormData) {
    const { profile } = await requireRole(["teacher"]);
    const admin = createAdminClient();

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();

    if (!firstName || !lastName) {
        redirect("/teacher/profile?error=missing-name");
    }

    if (
        firstName.length > 80 ||
        lastName.length > 80 ||
        phone.length > 30
    ) {
        redirect("/teacher/profile?error=invalid-fields");
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const { data: teacher, error: teacherError } = await admin
        .from("teachers")
        .update({
            first_name: firstName,
            last_name: lastName,
            name: fullName,
            phone: phone || null,
        })
        .eq("profile_id", profile.id)
        .select("id")
        .maybeSingle();
    
    if (teacherError || !teacher) {
        console.error("Teacher profile update failed", {
            profileId: profile.id,
            message: teacherError?.message,
        });

        redirect("/teacher/profile?error=update-failed");
    }

    const { error: profileError } = await admin
        .from("profiles")
        .update({
            full_name: fullName,
        })
        .eq("id", profile.id);

    if (profileError) {
        console.error("Profile name synchronization failed", {
            profileId: profile.id,
            message: profileError.message,
        });

        redirect("/teacher/profile?error=update-failed");
    }

    revalidatePath("/teacher/profile");
    revalidatePath("/teacher", "layout");

    redirect("/teacher/profile?success=profile-updated");
}
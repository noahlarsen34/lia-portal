"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function activateTeacherAccount(formData: FormData) {
    const tokenHash = String(formData.get("token_hash") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();

    const verificationType =
        type === "invite" || type === "magiclink" ? type : null;

    if (!tokenHash || !verificationType) {
        redirect("/activate-account?error=invalid-invitation");
    }

    const supabase = await createClient();
    const { data: verification, error: verificationError } =
        await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: verificationType,
        });

    if (verificationError || !verification.user) {
        redirect("/activate-account?error=expired-invitation");
    }

    const user = verification.user;
    const admin = createAdminClient();

    const { data: teacher, error: teacherError } = await admin
        .from("teachers")
        .select("id, status, portal_access_status, activated_at")
        .eq("profile_id", user.id)
        .maybeSingle();

    if (
        teacherError ||
        !teacher ||
        teacher.status !== "active" ||
        teacher.portal_access_status === "disabled"
    ) {
        await supabase.auth.signOut();
        redirect("/activate-account?error=teacher-access-unavailable");
    }

    const { error: activationError } = await admin
        .from("teachers")
        .update({
            portal_access_status: "active",
            password_status: "active",
            activated_at: teacher.activated_at ?? new Date().toISOString(),
        })
        .eq("id", teacher.id)
        .eq("profile_id", user.id);

    if (activationError) {
        await supabase.auth.signOut();
        redirect("/activate-account?error=activation-failed");
    }

    redirect("/teacher");
}

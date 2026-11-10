"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
    findPortalAccountByProfileId,
    getPortalAccountHomePath,
} from "@/utils/portal-account";

export async function activatePortalAccount(formData: FormData) {
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

    const account = await findPortalAccountByProfileId(user.id);

    if (
        !account ||
        account.status !== "active" ||
        account.portalAccessStatus === "disabled"
    ) {
        await supabase.auth.signOut();
        redirect("/activate-account?error=access-unavailable");
    }

    const accountTable =
        account.kind === "teacher" ? "teachers" : "district_liaisons";
    const activationUpdate =
        account.kind === "teacher"
            ? {
                portal_access_status: "active",
                password_status: "active",
                activated_at: account.activatedAt ?? new Date().toISOString(),
                last_portal_login_at: new Date().toISOString(),
            }
            : {
                portal_access_status: "active",
                activated_at: account.activatedAt ?? new Date().toISOString(),
                last_portal_login_at: new Date().toISOString(),
            };
    const { error: activationError } = await admin
        .from(accountTable)
        .update(activationUpdate)
        .eq("id", account.id)
        .eq("profile_id", user.id);

    if (activationError) {
        await supabase.auth.signOut();
        redirect("/activate-account?error=activation-failed");
    }

    redirect(getPortalAccountHomePath(account));
}

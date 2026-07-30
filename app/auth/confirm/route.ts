import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const tokenHash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type") as
        | EmailOtpType
        | null;
    
    const loginErrorUrl = new URL("/login", request.url);

    if (!tokenHash || !type) {
        loginErrorUrl.searchParams.set(
            "error",
            "invalid-invitation",
        );

        return NextResponse.redirect(loginErrorUrl);
    }

    const supabase = await createClient();

    const { 
        data: verification,
        error: verificationError,
    } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
    });

    if (verificationError || !verification.user) {
        loginErrorUrl.searchParams.set(
            "error",
            "expired-invitation",
        );

        return NextResponse.redirect(loginErrorUrl);
    }

    const user = verification.user;
    const admin = createAdminClient();

    const { data: teacher, error: teacherError } = await admin
        .from("teachers")
        .select(`
                id,
                status,
                profile_id,
                portal_access_status,
                activated_at
            `)
        .eq("profile_id", user.id)
        .maybeSingle();
    
    if (
        teacherError ||
        !teacher ||
        teacher.status !== "active" ||
        teacher.portal_access_status === "disabled"
    ) {
        await supabase.auth.signOut();

        loginErrorUrl.searchParams.set(
            "error",
            "teacher-access-unavailable",
        );

        return NextResponse.redirect(loginErrorUrl);
    }

    const activatedAt = new Date().toISOString();

    const { error: activationError } = await admin
        .from("teachers")
        .update({
            portal_access_status: "active",
            activated_at: teacher.activated_at ?? activatedAt,

            password_status: "active",
        })
        .eq("id", teacher.id)
        .eq("profile_id", user.id);
    
    if (activationError) {
        await supabase.auth.signOut();

        loginErrorUrl.searchParams.set(
            "error",
            "activation-failed",
        );

        return NextResponse.redirect(loginErrorUrl);
    }

    return NextResponse.redirect(
        new URL("/teacher", request.url),
    );
}
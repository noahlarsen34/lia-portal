"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const pendingEmailCookie = "lia_pending_teacher_email";

export async function requestTeacherCode(formData: FormData) {
    const email = String(
        formData.get("email") ?? "",
    ).trim().toLowerCase();

    if (!email) {
        redirect("/teacher-login?error=email-required");
    }

    const admin = createAdminClient();

    const { data: teacher } = await admin
        .from("teachers")
        .select(`
            id,
            profile_id,
            status,
            portal_access_status  
            `)
        .ilike("email", email)
        .maybeSingle();
    
    if (!teacher || teacher.status !== "active") {
        redirect("/teacher-login?error=access-unavailable");
    }

    if (
        teacher.portal_access_status !== "active" ||
        !teacher.profile_id
    ) {
        redirect("/teacher-login?error=activation-required");
    }

    const { data: deliveryRequest, error: deliveryRequestError } =
        await admin
            .from("email_deliveries")
            .insert({
                teacher_id: teacher.id,
                recipient: email,
                subject: "Your LIA Portal Login Code",
                email_kind: "login_code",
                status: "requested",
            })
            .select("id")
            .single();

    if (deliveryRequestError) {
        console.error("Could not record teacher OTP request", {
            teacherId: teacher.id,
            message: deliveryRequestError.message,
        });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: false,
        },
    });

    if (error) {
        console.error("Teacher OTP request failed", {
            teacherId: teacher.id,
            message: error.message,
            code: error.code,
            status: error.status,
        });

        if (deliveryRequest?.id) {
            await admin
                .from("email_deliveries")
                .update({
                    status: "failed",
                    status_message: error.message,
                    event_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", deliveryRequest.id);
        }

        const errorCode =
            error.code === "over_email_send_rate_limit"
                ? "code-rate-limited"
                : "code-send-failed";

        redirect(`/teacher-login?error=${errorCode}`);
    }

    const cookieStore = await cookies();

    cookieStore.set(pendingEmailCookie, email, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
    });

    redirect("/teacher-login/verify");
}

export async function verifyTeacherCode(formData: FormData) {
    const token = String(
        formData.get("token") ?? ""
    ).replace(/\D/g, "");

    const cookieStore = await cookies();
    const email = cookieStore.get(pendingEmailCookie)?.value;

    if (!email || token.length !== 6) {
        redirect("/teacher-login/verify?error=invalid-code");
    }

    const supabase = await createClient();

    const {
        data: verification,
        error: verificationError,
    } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
    });

    if (verificationError || !verification.user) {
        redirect("/teacher-login/verify?error=invalid-code");
    }

    const admin = createAdminClient();

    const { data: teacher } = await admin
        .from("teachers")
        .select("id, status, portal_access_status")
        .eq("profile_id", verification.user.id)
        .maybeSingle();
    
    if (
        !teacher ||
        teacher.status !== "active" ||
        teacher.portal_access_status !== "active"
    ) {
        await supabase.auth.signOut();

        redirect(
            "/teacher-login?error=access-unavailable",
        );
    }

    cookieStore.delete(pendingEmailCookie);

    redirect("/teacher");
}

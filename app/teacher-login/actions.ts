"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { escapeHtml, renderBrandedEmail, sendEmail } from "@/utils/email";

const pendingEmailCookie = "lia_pending_teacher_email";
const loginCodeSubject = "Your LIA Portal Login Code";
const requestCooldownSeconds = 60;

function createReferenceCode() {
    return `LIA-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function setPendingEmailCookie(email: string) {
    const cookieStore = await cookies();

    cookieStore.set(pendingEmailCookie, email, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
    });
}

async function requestCodeForEmail(email: string, isResend: boolean) {
    const admin = createAdminClient();

    const { data: teacher } = await admin
        .from("teachers")
        .select("id, profile_id, status, portal_access_status")
        .ilike("email", email)
        .maybeSingle();

    if (!teacher || teacher.status !== "active") {
        redirect("/teacher-login?error=access-unavailable");
    }

    if (
        teacher.portal_access_status !== "active" ||
        !teacher.profile_id
    ) {
        await setPendingEmailCookie(email);
        redirect("/teacher-login?error=activation-required");
    }

    const cooldownStart = new Date(
        Date.now() - requestCooldownSeconds * 1000,
    ).toISOString();

    const { data: recentRequest } = await admin
        .from("email_deliveries")
        .select("id")
        .eq("teacher_id", teacher.id)
        .eq("email_kind", "login_code")
        .gte("requested_at", cooldownStart)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (recentRequest) {
        await setPendingEmailCookie(email);
        redirect("/teacher-login/verify?error=code-cooldown");
    }

    const referenceCode = createReferenceCode();
    const { data: deliveryRequest, error: deliveryRequestError } =
        await admin
            .from("email_deliveries")
            .insert({
                teacher_id: teacher.id,
                recipient: email,
                subject: loginCodeSubject,
                email_kind: "login_code",
                status: "requested",
                reference_code: referenceCode,
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
        options: { shouldCreateUser: false },
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

    await setPendingEmailCookie(email);
    redirect(`/teacher-login/verify${isResend ? "?resent=true" : ""}`);
}

export async function requestTeacherCode(formData: FormData) {
    const email = String(
        formData.get("email") ?? "",
    ).trim().toLowerCase();

    if (!email) {
        redirect("/teacher-login?error=email-required");
    }

    return requestCodeForEmail(email, false);
}

export async function resendTeacherCode() {
    const cookieStore = await cookies();
    const email = cookieStore
        .get(pendingEmailCookie)
        ?.value.trim()
        .toLowerCase();

    if (!email) {
        redirect("/teacher-login?error=email-required");
    }

    return requestCodeForEmail(email, true);
}

export async function resendTeacherActivation() {
    const cookieStore = await cookies();
    const email = cookieStore
        .get(pendingEmailCookie)
        ?.value.trim()
        .toLowerCase();

    if (!email) {
        redirect("/teacher-login?error=email-required");
    }

    const admin = createAdminClient();
    const { data: teacher } = await admin
        .from("teachers")
        .select(
            "id, first_name, last_name, name, email, status, profile_id, portal_access_status",
        )
        .ilike("email", email)
        .maybeSingle();

    if (!teacher || teacher.status !== "active") {
        redirect("/teacher-login?error=access-unavailable");
    }

    if (teacher.portal_access_status === "active" && teacher.profile_id) {
        redirect("/teacher-login?notice=already-activated");
    }

    if (teacher.portal_access_status === "disabled") {
        redirect("/teacher-login?error=access-unavailable");
    }

    const cooldownStart = new Date(
        Date.now() - requestCooldownSeconds * 1000,
    ).toISOString();
    const { data: recentActivationEmail } = await admin
        .from("email_deliveries")
        .select("id")
        .eq("teacher_id", teacher.id)
        .in("email_kind", ["invitation", "access_link"])
        .gte("requested_at", cooldownStart)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (recentActivationEmail) {
        redirect("/teacher-login?error=activation-rate-limited");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

    if (!appUrl) {
        redirect("/teacher-login?error=activation-send-failed");
    }

    const fullName =
        `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
        teacher.name ||
        "LIA Teacher";

    const { data: invitation, error: invitationError } =
        await admin.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
                redirectTo: `${appUrl}/activate-account`,
                data: {
                    role: "teacher",
                    teacher_id: teacher.id,
                    full_name: fullName,
                },
            },
        });

    if (
        invitationError ||
        !invitation.user ||
        !invitation.properties.hashed_token
    ) {
        console.error("Self-service teacher activation link failed", {
            teacherId: teacher.id,
            message: invitationError?.message,
        });
        redirect("/teacher-login?error=activation-send-failed");
    }

    const authUserId = invitation.user.id;
    const { error: profileError } = await admin.from("profiles").upsert(
        {
            id: authUserId,
            full_name: fullName,
            email,
            role: "teacher",
        },
        { onConflict: "id" },
    );

    if (profileError) {
        console.error("Self-service teacher profile link failed", {
            teacherId: teacher.id,
            message: profileError.message,
        });
        redirect("/teacher-login?error=activation-send-failed");
    }

    const { error: teacherUpdateError } = await admin
        .from("teachers")
        .update({
            profile_id: authUserId,
            portal_access_status: "invited",
            password_status: "invited",
            invited_at: new Date().toISOString(),
            activated_at: null,
        })
        .eq("id", teacher.id);

    if (teacherUpdateError) {
        console.error("Self-service teacher record link failed", {
            teacherId: teacher.id,
            message: teacherUpdateError.message,
        });
        redirect("/teacher-login?error=activation-send-failed");
    }

    const accessUrl = new URL("/activate-account", appUrl);
    accessUrl.searchParams.set(
        "token_hash",
        invitation.properties.hashed_token,
    );
    accessUrl.searchParams.set("type", "invite");

    const subject = "Activate your LIA Teacher Portal account";
    const safeName = escapeHtml(fullName);
    const safeAccessUrl = escapeHtml(accessUrl.toString());
    const emailResult = await sendEmail({
        to: email,
        subject,
        html: renderBrandedEmail({
            preheader: "Activate your LIA Teacher Portal account.",
            eyebrow: "Teacher Portal",
            title: "Activate your teacher account",
            body: `
                <p style="margin:0; color:#3f3f46; font-size:15px; line-height:1.7;">
                    Hello ${safeName},
                </p>
                <p style="margin:16px 0 0; color:#3f3f46; font-size:15px; line-height:1.7;">
                    Use the button below to finish activating your LIA Teacher Portal account.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                    <tr>
                        <td style="border-radius:6px; background-color:#c4122f;">
                            <a href="${safeAccessUrl}" style="display:inline-block; padding:13px 22px; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">
                                Activate My Account
                            </a>
                        </td>
                    </tr>
                </table>
                <p style="margin:22px 0 0; color:#71717a; font-size:13px; line-height:1.6;">
                    Opening this email does not finish activation. You must select Activate My Account and then confirm activation on the portal page.
                </p>
            `,
        }),
        idempotencyKey: `teacher-self-activation-${teacher.id}-${Date.now()}`,
    });

    const referenceCode = createReferenceCode();
    await admin.from("email_deliveries").insert({
        resend_email_id: emailResult.id,
        teacher_id: teacher.id,
        recipient: email,
        subject,
        email_kind: "invitation",
        status: emailResult.error ? "failed" : "sent",
        status_message: emailResult.error,
        event_at: new Date().toISOString(),
        reference_code: referenceCode,
    });

    if (emailResult.error) {
        redirect("/teacher-login?error=activation-send-failed");
    }

    redirect("/teacher-login?notice=activation-sent");
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

    const { error: loginTrackingError } = await admin
        .from("teachers")
        .update({ last_portal_login_at: new Date().toISOString() })
        .eq("id", teacher.id);

    if (loginTrackingError) {
        console.error("Could not record successful teacher login", {
            teacherId: teacher.id,
            message: loginTrackingError.message,
        });
    }

    cookieStore.delete(pendingEmailCookie);

    redirect("/teacher");
}

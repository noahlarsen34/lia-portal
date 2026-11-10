"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { escapeHtml, renderBrandedEmail, sendEmail } from "@/utils/email";
import {
    findPortalAccountByEmail,
    findPortalAccountByProfileId,
    getPortalAccountHomePath,
    isActivePortalAccount,
    pendingPortalEmailCookie,
    type PortalAccount,
} from "@/utils/portal-account";

const loginCodeSubject = "Your LIA Portal Login Code";
const requestCooldownSeconds = 60;

function createReferenceCode() {
    return `LIA-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function deliveryOwner(account: PortalAccount) {
    return account.kind === "teacher"
        ? { teacher_id: account.id, district_liaison_id: null }
        : { teacher_id: null, district_liaison_id: account.id };
}

async function setPendingEmailCookie(email: string) {
    const cookieStore = await cookies();
    cookieStore.set(pendingPortalEmailCookie, email, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
    });
}

async function requestCodeForEmail(email: string, isResend: boolean) {
    const admin = createAdminClient();
    const account = await findPortalAccountByEmail(email);

    if (!account || account.status !== "active") {
        redirect("/teacher-login?error=access-unavailable");
    }
    if (!isActivePortalAccount(account)) {
        await setPendingEmailCookie(email);
        redirect("/teacher-login?error=activation-required");
    }

    const cooldownStart = new Date(
        Date.now() - requestCooldownSeconds * 1000,
    ).toISOString();
    const { data: recentRequest } = await admin
        .from("email_deliveries")
        .select("id")
        .ilike("recipient", email)
        .eq("email_kind", "login_code")
        .gte("requested_at", cooldownStart)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (recentRequest) {
        await setPendingEmailCookie(email);
        redirect("/teacher-login/verify?error=code-cooldown");
    }

    const { data: deliveryRequest, error: deliveryRequestError } = await admin
        .from("email_deliveries")
        .insert({
            ...deliveryOwner(account),
            recipient: email,
            subject: loginCodeSubject,
            email_kind: "login_code",
            status: "requested",
            reference_code: createReferenceCode(),
        })
        .select("id")
        .single();

    if (deliveryRequestError) {
        console.error("Could not record portal OTP request", {
            accountKind: account.kind,
            accountId: account.id,
            message: deliveryRequestError.message,
        });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });

    if (error) {
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
        console.error("Portal OTP request failed", {
            accountKind: account.kind,
            accountId: account.id,
            message: error.message,
        });
        redirect(
            `/teacher-login?error=${
                error.code === "over_email_send_rate_limit"
                    ? "code-rate-limited"
                    : "code-send-failed"
            }`,
        );
    }

    await setPendingEmailCookie(email);
    redirect(`/teacher-login/verify${isResend ? "?resent=true" : ""}`);
}

export async function requestTeacherCode(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) redirect("/teacher-login?error=email-required");
    return requestCodeForEmail(email, false);
}

export async function resendTeacherCode() {
    const email = (await cookies())
        .get(pendingPortalEmailCookie)
        ?.value.trim()
        .toLowerCase();
    if (!email) redirect("/teacher-login?error=email-required");
    return requestCodeForEmail(email, true);
}

// Teacher accounts retain their existing self-service activation behavior.
// Liaison invitations will be managed by the admin assignment screen.
export async function resendTeacherActivation() {
    const email = (await cookies())
        .get(pendingPortalEmailCookie)
        ?.value.trim()
        .toLowerCase();
    if (!email) redirect("/teacher-login?error=email-required");

    const account = await findPortalAccountByEmail(email);
    if (!account || account.status !== "active") {
        redirect("/teacher-login?error=access-unavailable");
    }
    if (account.kind === "district_liaison") {
        redirect("/teacher-login?error=liaison-activation-required");
    }
    if (account.portalAccessStatus === "active" && account.profileId) {
        redirect("/teacher-login?notice=already-activated");
    }
    if (account.portalAccessStatus === "disabled") {
        redirect("/teacher-login?error=access-unavailable");
    }

    const admin = createAdminClient();
    const cooldownStart = new Date(
        Date.now() - requestCooldownSeconds * 1000,
    ).toISOString();
    const { data: recentActivationEmail } = await admin
        .from("email_deliveries")
        .select("id")
        .eq("teacher_id", account.id)
        .in("email_kind", ["invitation", "access_link"])
        .gte("requested_at", cooldownStart)
        .limit(1)
        .maybeSingle();
    if (recentActivationEmail) {
        redirect("/teacher-login?error=activation-rate-limited");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!appUrl) redirect("/teacher-login?error=activation-send-failed");

    const { data: invitation, error: invitationError } =
        await admin.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
                redirectTo: `${appUrl}/activate-account`,
                data: {
                    role: "teacher",
                    teacher_id: account.id,
                    full_name: account.fullName,
                },
            },
        });
    if (
        invitationError ||
        !invitation.user ||
        !invitation.properties.hashed_token
    ) {
        redirect("/teacher-login?error=activation-send-failed");
    }

    const authUserId = invitation.user.id;
    const { error: profileError } = await admin.from("profiles").upsert(
        {
            id: authUserId,
            full_name: account.fullName,
            email,
            role: "teacher",
        },
        { onConflict: "id" },
    );
    if (profileError) redirect("/teacher-login?error=activation-send-failed");

    const { error: teacherUpdateError } = await admin
        .from("teachers")
        .update({
            profile_id: authUserId,
            portal_access_status: "invited",
            password_status: "invited",
            invited_at: new Date().toISOString(),
            activated_at: null,
        })
        .eq("id", account.id);
    if (teacherUpdateError) {
        redirect("/teacher-login?error=activation-send-failed");
    }

    const accessUrl = new URL("/activate-account", appUrl);
    accessUrl.searchParams.set("token_hash", invitation.properties.hashed_token);
    accessUrl.searchParams.set("type", "invite");
    const subject = "Activate your LIA Portal account";
    const emailResult = await sendEmail({
        to: email,
        subject,
        html: renderBrandedEmail({
            preheader: "Activate your LIA Portal account.",
            eyebrow: "LIA Portal",
            title: "Activate your portal account",
            body: `<p>Hello ${escapeHtml(account.fullName)},</p><p>Use the button below to finish activating your LIA Portal account.</p><p><a href="${escapeHtml(accessUrl.toString())}" style="display:inline-block;padding:13px 22px;border-radius:6px;background:#c4122f;color:#fff;font-weight:700;text-decoration:none">Activate My Account</a></p>`,
        }),
        idempotencyKey: `teacher-self-activation-${account.id}-${Date.now()}`,
    });
    await admin.from("email_deliveries").insert({
        ...deliveryOwner(account),
        resend_email_id: emailResult.id,
        recipient: email,
        subject,
        email_kind: "invitation",
        status: emailResult.error ? "failed" : "sent",
        status_message: emailResult.error,
        event_at: new Date().toISOString(),
        reference_code: createReferenceCode(),
    });
    if (emailResult.error) {
        redirect("/teacher-login?error=activation-send-failed");
    }
    redirect("/teacher-login?notice=activation-sent");
}

export async function verifyTeacherCode(formData: FormData) {
    const token = String(formData.get("token") ?? "").replace(/\D/g, "");
    const cookieStore = await cookies();
    const email = cookieStore.get(pendingPortalEmailCookie)?.value;
    if (!email || token.length !== 6) {
        redirect("/teacher-login/verify?error=invalid-code");
    }

    const supabase = await createClient();
    const { data: verification, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
    });
    if (error || !verification.user) {
        redirect("/teacher-login/verify?error=invalid-code");
    }

    const account = await findPortalAccountByProfileId(verification.user.id);
    if (!isActivePortalAccount(account)) {
        await supabase.auth.signOut();
        redirect("/teacher-login?error=access-unavailable");
    }

    const admin = createAdminClient();
    const table = account.kind === "teacher" ? "teachers" : "district_liaisons";
    const { error: trackingError } = await admin
        .from(table)
        .update({ last_portal_login_at: new Date().toISOString() })
        .eq("id", account.id);
    if (trackingError) {
        console.error("Could not record successful portal login", {
            accountKind: account.kind,
            accountId: account.id,
            message: trackingError.message,
        });
    }

    cookieStore.delete(pendingPortalEmailCookie);
    redirect(getPortalAccountHomePath(account));
}

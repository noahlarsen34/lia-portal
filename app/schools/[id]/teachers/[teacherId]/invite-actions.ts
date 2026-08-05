"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { escapeHtml, renderBrandedEmail, sendEmail } from "@/utils/email";

export async function inviteTeacher(
    schoolId: string,
    teacherId: string,
) {
    const { supabase, profile } = await requireStaff();
    const admin = createAdminClient();

    const { data: teacher, error: teacherError} = await supabase
        .from("teachers")
        .select(`
                id,
                school_id,
                first_name,
                last_name,
                name,
                email,
                status,
                profile_id,
                portal_access_status,
                password_status,
                activated_at
            `)
        .eq("id", teacherId)
        .eq("school_id", schoolId)
        .maybeSingle();
    
    const returnPath =
            `/schools/${schoolId}/teachers/${teacherId}`;
    
    if (teacherError || !teacher) {
        redirect(`${returnPath}?invite=teacher-not-found`);
    }

    if (teacher.status !== "active") {
        redirect(`${returnPath}?invite=teacher-inactive`);
    }

    const email = teacher.email?.trim().toLowerCase();

    if (!email) {
        redirect(`${returnPath}?invite=email-required`);
    }

    const isActivated =
        teacher.portal_access_status === "active" ||
        teacher.password_status === "active" ||
        Boolean(teacher.activated_at);

    if (teacher.portal_access_status === "disabled") {
        redirect(`${returnPath}?invite=access-disabled`);
    }

    const isResend = teacher.portal_access_status === "invited";

    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

    if (!appUrl) {
        redirect(`${returnPath}?invite=configuration-error`);
    }

    const fullName =
        `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
        teacher.name ||
        "LIA Teacher";
    
    const linkType = isActivated ? "magiclink" : "invite";
    const { data: invitation, error: invitationError } =
        await admin.auth.admin.generateLink({
            type: linkType,
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
        console.error("Teacher access-link generation failed", {
            teacherId,
            message: invitationError?.message,
        });

        redirect(`${returnPath}?invite=send-failed`);
    }

    const authUserId = invitation.user.id;

    const hasProfileMismatch =
        Boolean(teacher.profile_id) && teacher.profile_id !== authUserId;

    if (hasProfileMismatch && isActivated) {
        console.error("Teacher invitation returned a different auth user", {
            teacherId,
            existingProfileId: teacher.profile_id,
            invitedProfileId: authUserId,
            reason: "activated-account-mismatch",
        });

        redirect(`${returnPath}?invite=link-failed`);
    }

    if (hasProfileMismatch) {
        console.warn("Relinking unactivated teacher to current auth user", {
            teacherId,
            previousProfileId: teacher.profile_id,
            invitedProfileId: authUserId,
        });
    }

    const { error: profileError } = await admin
        .from("profiles")
        .upsert(
            {
                id: authUserId,
                full_name: fullName,
                email,
                role: "teacher",
            },
            {
                onConflict: "id",
            },
        );
    
    if (profileError) {
        console.error("Teacher profile linking failed", {
            teacherId,
            authUserId,
            message: profileError.message,
        });

        redirect(`${returnPath}?invite=link-failed`);
    }

    const teacherUpdate = isActivated
        ? {
            profile_id: authUserId,
        }
        : {
            profile_id: authUserId,
            portal_access_status: "invited",
            invited_at: new Date().toISOString(),
            invited_by: profile.id,
            password_status: "invited",
            activated_at: null,
        };

    const { error: linkError } = await admin
        .from("teachers")
        .update(teacherUpdate)
        .eq("id", teacher.id);
    
    if (linkError) {
        console.error("Teacher record linking failed", {
            teacherId,
            authUserId,
            message: linkError.message,
        });

        redirect(`${returnPath}?invite=link-failed`);
    }

    const accessUrl = new URL("/activate-account", appUrl);
    accessUrl.searchParams.set(
        "token_hash",
        invitation.properties.hashed_token,
    );
    accessUrl.searchParams.set("type", linkType);

    const safeName = escapeHtml(fullName);
    const safeAccessUrl = escapeHtml(accessUrl.toString());
    const emailResult = await sendEmail({
        to: email,
        subject: isActivated
            ? "Your new LIA Portal access link"
            : "Activate your LIA Teacher Portal account",
        html: renderBrandedEmail({
            preheader: "Open your secure LIA Teacher Portal access link.",
            eyebrow: "Teacher Portal",
            title: isActivated
                ? "Your new portal access link"
                : "Activate your teacher account",
            body: `
                <p style="margin:0; color:#3f3f46; font-size:15px; line-height:1.7;">
                    Hello ${safeName},
                </p>
                <p style="margin:16px 0 0; color:#3f3f46; font-size:15px; line-height:1.7;">
                    ${isActivated
                        ? "A new secure access link was requested for your LIA Teacher Portal account."
                        : "You have been invited to activate your LIA Teacher Portal account."}
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                    <tr>
                        <td style="border-radius:6px; background-color:#c4122f;">
                            <a href="${safeAccessUrl}" style="display:inline-block; padding:13px 22px; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">
                                ${isActivated ? "Open Teacher Portal" : "Activate My Account"}
                            </a>
                        </td>
                    </tr>
                </table>
                <p style="margin:22px 0 0; color:#71717a; font-size:13px; line-height:1.6;">
                    This is a one-time security link. If it expires, an administrator or RPM can send you another one.
                </p>
            `,
        }),
        idempotencyKey: `teacher-access-${teacher.id}-${Date.now()}`,
    });

    if (emailResult.error) {
        console.error("Teacher access email failed", {
            teacherId,
            message: emailResult.error,
        });

        redirect(`${returnPath}?invite=send-failed`);
    }

    if (isActivated) {
        redirect(`${returnPath}?invite=access-sent`);
    }

    redirect(`${returnPath}?invite=${isResend ? "resent" : "sent"}`);
}

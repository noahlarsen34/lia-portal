"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

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

    if (isActivated) {
        redirect(`${returnPath}?invite=already-linked`);
    }

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
    
    const { data: invitation, error: invitationError } =
        await admin.auth.admin.inviteUserByEmail(email, {
            redirectTo:
                `${appUrl}/teacher`,
            data: {
                role: "teacher",
                teacher_id: teacher.id,
                full_name: fullName,
            },
        });

    if (invitationError || !invitation.user) {
        console.error("Teacher invitation failed", {
            teacherId,
            message: invitationError?.message,
        });

        redirect(`${returnPath}?invite=send-failed`);
    }

    const authUserId = invitation.user.id;

    if (teacher.profile_id && teacher.profile_id !== authUserId) {
        console.error("Teacher invitation returned a different auth user", {
            teacherId,
            existingProfileId: teacher.profile_id,
            invitedProfileId: authUserId,
        });

        redirect(`${returnPath}?invite=link-failed`);
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

    const { error: linkError } = await admin
        .from("teachers")
        .update({
            profile_id: authUserId,
            portal_access_status: "invited",
            invited_at: new Date().toISOString(),
            invited_by: profile.id,
            password_status: "invited",
            activated_at: null,
        })
        .eq("id", teacher.id);
    
    if (linkError) {
        console.error("Teacher record linking failed", {
            teacherId,
            authUserId,
            message: linkError.message,
        });

        redirect(`${returnPath}?invite=link-failed`);
    }

    redirect(`${returnPath}?invite=${isResend ? "resent" : "sent"}`);
}

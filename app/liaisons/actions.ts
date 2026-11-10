"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { escapeHtml, renderBrandedEmail, sendEmail } from "@/utils/email";

function textValue(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
}

function districtIds(formData: FormData) {
    return Array.from(
        new Set(
            formData
                .getAll("district_ids")
                .map((value) => String(value).trim())
                .filter(Boolean),
        ),
    );
}

function isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function validateDistrictIds(ids: string[]) {
    if (ids.length === 0) return false;

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("districts")
        .select("id")
        .in("id", ids);

    return !error && (data?.length ?? 0) === ids.length;
}

function createReferenceCode() {
    return `LIA-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export async function createDistrictLiaison(formData: FormData) {
    const { profile } = await requireAdmin();
    const firstName = textValue(formData, "first_name");
    const lastName = textValue(formData, "last_name");
    const email = textValue(formData, "email").toLowerCase();
    const assignments = districtIds(formData);

    if (!firstName || !lastName || !isEmail(email) || assignments.length === 0) {
        redirect("/liaisons/new?error=missing-fields");
    }

    if (!(await validateDistrictIds(assignments))) {
        redirect("/liaisons/new?error=invalid-district");
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
        .from("district_liaisons")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

    if (existing) {
        redirect("/liaisons/new?error=email-exists");
    }

    const { data: liaison, error: liaisonError } = await admin
        .from("district_liaisons")
        .insert({
            first_name: firstName,
            last_name: lastName,
            email,
            status: "active",
            portal_access_status: "not_invited",
        })
        .select("id")
        .single();

    if (liaisonError || !liaison) {
        redirect("/liaisons/new?error=create-failed");
    }

    const { error: assignmentError } = await admin
        .from("district_liaison_districts")
        .insert(
            assignments.map((districtId) => ({
                liaison_id: liaison.id,
                district_id: districtId,
                assigned_by: profile.id,
            })),
        );

    if (assignmentError) {
        await admin.from("district_liaisons").delete().eq("id", liaison.id);
        redirect("/liaisons/new?error=create-failed");
    }

    revalidatePath("/liaisons");
    redirect(`/liaisons/${liaison.id}?notice=created`);
}

export async function updateDistrictLiaison(
    liaisonId: string,
    formData: FormData,
) {
    const { profile } = await requireAdmin();
    const firstName = textValue(formData, "first_name");
    const lastName = textValue(formData, "last_name");
    const email = textValue(formData, "email").toLowerCase();
    const assignments = districtIds(formData);
    const returnPath = `/liaisons/${liaisonId}`;

    if (!firstName || !lastName || !isEmail(email) || assignments.length === 0) {
        redirect(`${returnPath}?error=missing-fields`);
    }

    if (!(await validateDistrictIds(assignments))) {
        redirect(`${returnPath}?error=invalid-district`);
    }

    const admin = createAdminClient();
    const { data: liaison } = await admin
        .from("district_liaisons")
        .select("id, profile_id, portal_access_status")
        .eq("id", liaisonId)
        .maybeSingle();

    if (!liaison) redirect("/liaisons?error=not-found");

    const { data: duplicate } = await admin
        .from("district_liaisons")
        .select("id")
        .ilike("email", email)
        .neq("id", liaisonId)
        .maybeSingle();

    if (duplicate) redirect(`${returnPath}?error=email-exists`);

    const { error: updateError } = await admin
        .from("district_liaisons")
        .update({
            first_name: firstName,
            last_name: lastName,
            email,
            updated_at: new Date().toISOString(),
        })
        .eq("id", liaisonId);

    if (updateError) redirect(`${returnPath}?error=update-failed`);

    if (liaison.profile_id) {
        const { error: profileError } = await admin
            .from("profiles")
            .update({
                full_name: `${firstName} ${lastName}`,
                email,
                role: "district_liaison",
            })
            .eq("id", liaison.profile_id);

        if (profileError) redirect(`${returnPath}?error=update-failed`);

        const { error: authError } = await admin.auth.admin.updateUserById(
            liaison.profile_id,
            {
                email,
                user_metadata: {
                    role: "district_liaison",
                    portal_account_id: liaisonId,
                    full_name: `${firstName} ${lastName}`,
                },
            },
        );

        if (authError) redirect(`${returnPath}?error=update-failed`);
    }

    const { data: currentAssignments } = await admin
        .from("district_liaison_districts")
        .select("district_id")
        .eq("liaison_id", liaisonId);
    const currentIds = new Set(
        (currentAssignments ?? []).map((assignment) => assignment.district_id),
    );
    const desiredIds = new Set(assignments);
    const removedIds = [...currentIds].filter((id) => !desiredIds.has(id));
    const addedIds = assignments.filter((id) => !currentIds.has(id));

    if (removedIds.length) {
        const { error } = await admin
            .from("district_liaison_districts")
            .delete()
            .eq("liaison_id", liaisonId)
            .in("district_id", removedIds);
        if (error) redirect(`${returnPath}?error=assignment-failed`);
    }

    if (addedIds.length) {
        const { error } = await admin
            .from("district_liaison_districts")
            .insert(
                addedIds.map((districtId) => ({
                    liaison_id: liaisonId,
                    district_id: districtId,
                    assigned_by: profile.id,
                })),
            );
        if (error) redirect(`${returnPath}?error=assignment-failed`);
    }

    revalidatePath("/liaisons");
    revalidatePath(returnPath);
    revalidatePath("/liaison");
    redirect(`${returnPath}?notice=updated`);
}

export async function setDistrictLiaisonStatus(
    liaisonId: string,
    nextStatus: "active" | "inactive",
) {
    await requireAdmin();
    const admin = createAdminClient();
    const { data: liaison } = await admin
        .from("district_liaisons")
        .select("activated_at")
        .eq("id", liaisonId)
        .maybeSingle();

    if (!liaison) redirect("/liaisons?error=not-found");

    const portalAccessStatus =
        nextStatus === "inactive"
            ? "disabled"
            : liaison.activated_at
                ? "active"
                : "not_invited";
    const { error } = await admin
        .from("district_liaisons")
        .update({
            status: nextStatus,
            portal_access_status: portalAccessStatus,
            updated_at: new Date().toISOString(),
        })
        .eq("id", liaisonId);

    if (error) redirect(`/liaisons/${liaisonId}?error=status-failed`);

    revalidatePath("/liaisons");
    revalidatePath(`/liaisons/${liaisonId}`);
    redirect(`/liaisons/${liaisonId}?notice=${nextStatus}`);
}

export async function sendDistrictLiaisonInvitation(liaisonId: string) {
    const { profile } = await requireAdmin();
    const admin = createAdminClient();
    const returnPath = `/liaisons/${liaisonId}`;
    const { data: liaison } = await admin
        .from("district_liaisons")
        .select(
            "id, profile_id, first_name, last_name, email, status, portal_access_status, activated_at",
        )
        .eq("id", liaisonId)
        .maybeSingle();

    if (!liaison) redirect("/liaisons?error=not-found");
    if (liaison.status !== "active" || liaison.portal_access_status === "disabled") {
        redirect(`${returnPath}?error=access-disabled`);
    }

    const email = liaison.email.trim().toLowerCase();
    const fullName =
        `${liaison.first_name ?? ""} ${liaison.last_name ?? ""}`.trim() ||
        "District Liaison";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!appUrl) redirect(`${returnPath}?error=configuration-error`);

    const isActivated = Boolean(liaison.activated_at);
    const linkType = isActivated ? "magiclink" : "invite";
    const { data: invitation, error: invitationError } =
        await admin.auth.admin.generateLink({
            type: linkType,
            email,
            options: {
                redirectTo: `${appUrl}/activate-account`,
                data: {
                    role: "district_liaison",
                    portal_account_id: liaison.id,
                    full_name: fullName,
                },
            },
        });

    if (
        invitationError ||
        !invitation.user ||
        !invitation.properties.hashed_token
    ) {
        redirect(`${returnPath}?error=invite-failed`);
    }

    const authUserId = invitation.user.id;
    if (liaison.profile_id && liaison.profile_id !== authUserId && isActivated) {
        redirect(`${returnPath}?error=account-mismatch`);
    }

    const { error: profileError } = await admin.from("profiles").upsert(
        {
            id: authUserId,
            full_name: fullName,
            email,
            role: "district_liaison",
        },
        { onConflict: "id" },
    );
    if (profileError) redirect(`${returnPath}?error=invite-failed`);

    const { error: linkError } = await admin
        .from("district_liaisons")
        .update(
            isActivated
                ? { profile_id: authUserId, updated_at: new Date().toISOString() }
                : {
                    profile_id: authUserId,
                    portal_access_status: "invited",
                    invited_at: new Date().toISOString(),
                    invited_by: profile.id,
                    updated_at: new Date().toISOString(),
                },
        )
        .eq("id", liaisonId);
    if (linkError) redirect(`${returnPath}?error=invite-failed`);

    const accessUrl = new URL("/activate-account", appUrl);
    accessUrl.searchParams.set("token_hash", invitation.properties.hashed_token);
    accessUrl.searchParams.set("type", linkType);
    const subject = isActivated
        ? "Your LIA Portal access link"
        : "Activate your LIA Portal account";
    const emailResult = await sendEmail({
        to: email,
        subject,
        html: renderBrandedEmail({
            preheader: isActivated
                ? "Open your secure LIA Portal access link."
                : "Activate your LIA Portal account.",
            eyebrow: "District Liaison Portal",
            title: isActivated
                ? "Your new portal access link"
                : "Activate your district liaison account",
            body: `
                <p style="margin:0;color:#3f3f46;font-size:15px;line-height:1.7;">Hello ${escapeHtml(fullName)},</p>
                <p style="margin:16px 0 0;color:#3f3f46;font-size:15px;line-height:1.7;">
                    ${isActivated ? "A new secure access link was requested for your LIA Portal account." : "You have been invited to activate your LIA District Liaison Portal account."}
                </p>
                <p style="margin:28px 0 0;">
                    <a href="${escapeHtml(accessUrl.toString())}" style="display:inline-block;padding:13px 22px;border-radius:6px;background:#c4122f;color:#fff;font-weight:700;text-decoration:none;">
                        ${isActivated ? "Open LIA Portal" : "Activate My Account"}
                    </a>
                </p>
            `,
        }),
        idempotencyKey: `liaison-access-${liaison.id}-${Date.now()}`,
    });

    await admin.from("email_deliveries").insert({
        resend_email_id: emailResult.id,
        district_liaison_id: liaison.id,
        recipient: email,
        subject,
        email_kind: isActivated ? "access_link" : "invitation",
        status: emailResult.error ? "failed" : "sent",
        status_message: emailResult.error,
        event_at: new Date().toISOString(),
        reference_code: createReferenceCode(),
    });

    if (emailResult.error) redirect(`${returnPath}?error=invite-failed`);

    revalidatePath("/liaisons");
    revalidatePath(returnPath);
    redirect(`${returnPath}?notice=${isActivated ? "access-sent" : "invite-sent"}`);
}

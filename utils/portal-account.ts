import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export const pendingPortalEmailCookie = "lia_pending_portal_email";

export type PortalAccount =
    | {
        kind: "teacher";
        id: string;
        profileId: string | null;
        email: string;
        fullName: string;
        status: string;
        portalAccessStatus: string | null;
        activatedAt: string | null;
    }
    | {
        kind: "district_liaison";
        id: string;
        profileId: string | null;
        email: string;
        fullName: string;
        status: string;
        portalAccessStatus: string;
        activatedAt: string | null;
    };

function getFullName(
    firstName: string | null,
    lastName: string | null,
    fallback: string | null,
    defaultName: string,
) {
    return `${firstName ?? ""} ${lastName ?? ""}`.trim() || fallback || defaultName;
}

export async function findPortalAccountByEmail(
    email: string,
): Promise<PortalAccount | null> {
    const admin = createAdminClient();
    const normalizedEmail = email.trim().toLowerCase();

    const [{ data: teacher }, { data: liaison }] = await Promise.all([
        admin
            .from("teachers")
            .select(
                "id, profile_id, first_name, last_name, name, email, status, portal_access_status, activated_at",
            )
            .ilike("email", normalizedEmail)
            .maybeSingle(),
        admin
            .from("district_liaisons")
            .select(
                "id, profile_id, first_name, last_name, email, status, portal_access_status, activated_at",
            )
            .ilike("email", normalizedEmail)
            .maybeSingle(),
    ]);

    if (teacher) {
        return {
            kind: "teacher",
            id: teacher.id,
            profileId: teacher.profile_id,
            email: teacher.email ?? normalizedEmail,
            fullName: getFullName(
                teacher.first_name,
                teacher.last_name,
                teacher.name,
                "LIA Teacher",
            ),
            status: teacher.status,
            portalAccessStatus: teacher.portal_access_status,
            activatedAt: teacher.activated_at,
        };
    }

    if (!liaison) return null;

    return {
        kind: "district_liaison",
        id: liaison.id,
        profileId: liaison.profile_id,
        email: liaison.email,
        fullName: getFullName(
            liaison.first_name,
            liaison.last_name,
            null,
            "District Liaison",
        ),
        status: liaison.status,
        portalAccessStatus: liaison.portal_access_status,
        activatedAt: liaison.activated_at,
    };
}

export async function findPortalAccountByProfileId(
    profileId: string,
): Promise<PortalAccount | null> {
    const admin = createAdminClient();
    const [{ data: teacher }, { data: liaison }] = await Promise.all([
        admin
            .from("teachers")
            .select(
                "id, profile_id, first_name, last_name, name, email, status, portal_access_status, activated_at",
            )
            .eq("profile_id", profileId)
            .maybeSingle(),
        admin
            .from("district_liaisons")
            .select(
                "id, profile_id, first_name, last_name, email, status, portal_access_status, activated_at",
            )
            .eq("profile_id", profileId)
            .maybeSingle(),
    ]);

    if (teacher) {
        return {
            kind: "teacher",
            id: teacher.id,
            profileId: teacher.profile_id,
            email: teacher.email ?? "",
            fullName: getFullName(
                teacher.first_name,
                teacher.last_name,
                teacher.name,
                "LIA Teacher",
            ),
            status: teacher.status,
            portalAccessStatus: teacher.portal_access_status,
            activatedAt: teacher.activated_at,
        };
    }

    if (!liaison) return null;

    return {
        kind: "district_liaison",
        id: liaison.id,
        profileId: liaison.profile_id,
        email: liaison.email,
        fullName: getFullName(
            liaison.first_name,
            liaison.last_name,
            null,
            "District Liaison",
        ),
        status: liaison.status,
        portalAccessStatus: liaison.portal_access_status,
        activatedAt: liaison.activated_at,
    };
}

export function isActivePortalAccount(
    account: PortalAccount | null,
): account is PortalAccount {
    return Boolean(
        account &&
        account.status === "active" &&
        account.portalAccessStatus === "active" &&
        account.profileId,
    );
}

export function getPortalAccountHomePath(account: PortalAccount) {
    return account.kind === "district_liaison" ? "/liaison" : "/teacher";
}

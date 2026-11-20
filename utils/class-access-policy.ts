export type ClassAccessPolicyRole =
    | "primary"
    | "co_teacher"
    | "district_liaison";

export type ClassAccessPolicyInput = {
    viewerProfileId: string;
    viewerRole: string | null;
    primaryTeacherProfileId: string;
    hasCoTeacherAssignment: boolean;
    classDistrictId: string | null;
    liaisonStatus: string | null;
    liaisonPortalAccessStatus: string | null;
    liaisonDistrictIds: readonly string[];
};

export function resolveClassAccessRole({
    viewerProfileId,
    viewerRole,
    primaryTeacherProfileId,
    hasCoTeacherAssignment,
    classDistrictId,
    liaisonStatus,
    liaisonPortalAccessStatus,
    liaisonDistrictIds,
}: ClassAccessPolicyInput): ClassAccessPolicyRole | null {
    if (viewerRole === "district_liaison") {
        const hasActiveLiaisonAccount =
            liaisonStatus === "active" &&
            liaisonPortalAccessStatus === "active";
        const hasDistrictAssignment = Boolean(
            classDistrictId && liaisonDistrictIds.includes(classDistrictId),
        );

        return hasActiveLiaisonAccount && hasDistrictAssignment
            ? "district_liaison"
            : null;
    }

    if (primaryTeacherProfileId === viewerProfileId) return "primary";
    if (hasCoTeacherAssignment) return "co_teacher";

    return null;
}

export function canMutateClass(role: ClassAccessPolicyRole | null) {
    return role === "primary";
}

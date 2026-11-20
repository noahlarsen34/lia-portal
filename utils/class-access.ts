import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import {
    canMutateClass,
    resolveClassAccessRole,
    type ClassAccessPolicyRole,
} from "@/utils/class-access-policy";

export type ClassAccessRole = ClassAccessPolicyRole;

export type ClassAccess = {
    classId: string;
    primaryTeacherProfileId: string;
    role: ClassAccessRole;
    isPrimaryTeacher: boolean;
    isDistrictLiaison: boolean;
};

export async function getClassAccess(
    classId: string,
    teacherProfileId: string,
): Promise<ClassAccess | null> {
    const admin = createAdminClient();
    const { data: liaClass } = await admin
        .from("lia_classes")
        .select("id, teacher_profile_id, school_id")
        .eq("id", classId)
        .maybeSingle();

    if (!liaClass) return null;

    const { data: viewerProfile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", teacherProfileId)
        .maybeSingle();
    const viewerRole = viewerProfile?.role ?? null;
    const isLiaisonProfile = viewerRole === "district_liaison";

    const { data: assignment } = isLiaisonProfile
        ? { data: null }
        : await admin
            .from("lia_class_teachers")
            .select("role")
            .eq("class_id", classId)
            .eq("teacher_profile_id", teacherProfileId)
            .eq("role", "co_teacher")
            .maybeSingle();

    let classDistrictId: string | null = null;
    let liaisonStatus: string | null = null;
    let liaisonPortalAccessStatus: string | null = null;
    let liaisonDistrictIds: string[] = [];

    if (isLiaisonProfile) {
        const [{ data: school }, { data: liaison }] = await Promise.all([
            admin
                .from("schools")
                .select("district_id")
                .eq("id", liaClass.school_id)
                .maybeSingle(),
            admin
                .from("district_liaisons")
                .select("id, status, portal_access_status")
                .eq("profile_id", teacherProfileId)
                .maybeSingle(),
        ]);

        classDistrictId = school?.district_id ?? null;
        liaisonStatus = liaison?.status ?? null;
        liaisonPortalAccessStatus = liaison?.portal_access_status ?? null;

        if (liaison) {
            const { data: districtAssignments } = await admin
                .from("district_liaison_districts")
                .select("district_id")
                .eq("liaison_id", liaison.id);
            liaisonDistrictIds = (districtAssignments ?? []).map(
                (districtAssignment) => districtAssignment.district_id,
            );
        }
    }

    const role = resolveClassAccessRole({
        viewerProfileId: teacherProfileId,
        viewerRole,
        primaryTeacherProfileId: liaClass.teacher_profile_id,
        hasCoTeacherAssignment: Boolean(assignment),
        classDistrictId,
        liaisonStatus,
        liaisonPortalAccessStatus,
        liaisonDistrictIds,
    });

    if (!role) return null;

    return {
        classId: liaClass.id,
        primaryTeacherProfileId: liaClass.teacher_profile_id,
        role,
        isPrimaryTeacher: canMutateClass(role),
        isDistrictLiaison: role === "district_liaison",
    };
}

export async function getAccessibleClassIds(teacherProfileId: string) {
    const admin = createAdminClient();
    const [{ data: ownedClasses }, { data: assignments }] = await Promise.all([
        admin
            .from("lia_classes")
            .select("id")
            .eq("teacher_profile_id", teacherProfileId),
        admin
            .from("lia_class_teachers")
            .select("class_id")
            .eq("teacher_profile_id", teacherProfileId),
    ]);

    return Array.from(
        new Set([
            ...(ownedClasses ?? []).map((liaClass) => liaClass.id),
            ...(assignments ?? []).map((assignment) => assignment.class_id),
        ]),
    );
}


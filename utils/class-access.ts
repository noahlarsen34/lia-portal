import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export type ClassAccessRole = "primary" | "co_teacher" | "district_liaison";

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

    if (liaClass.teacher_profile_id === teacherProfileId) {
        return {
            classId: liaClass.id,
            primaryTeacherProfileId: liaClass.teacher_profile_id,
            role: "primary",
            isPrimaryTeacher: true,
            isDistrictLiaison: false,
        };
    }

    const { data: assignment } = await admin
        .from("lia_class_teachers")
        .select("role")
        .eq("class_id", classId)
        .eq("teacher_profile_id", teacherProfileId)
        .eq("role", "co_teacher")
        .maybeSingle();

    if (assignment) {
        return {
            classId: liaClass.id,
            primaryTeacherProfileId: liaClass.teacher_profile_id,
            role: "co_teacher",
            isPrimaryTeacher: false,
            isDistrictLiaison: false,
        };
    }

    const { data: school } = await admin
        .from("schools")
        .select("district_id")
        .eq("id", liaClass.school_id)
        .maybeSingle();

    if (!school?.district_id) return null;

    const { data: liaison } = await admin
        .from("district_liaisons")
        .select("id")
        .eq("profile_id", teacherProfileId)
        .eq("status", "active")
        .eq("portal_access_status", "active")
        .maybeSingle();

    if (!liaison) return null;

    const { data: districtAssignment } = await admin
        .from("district_liaison_districts")
        .select("district_id")
        .eq("liaison_id", liaison.id)
        .eq("district_id", school.district_id)
        .maybeSingle();

    if (!districtAssignment) return null;

    return {
        classId: liaClass.id,
        primaryTeacherProfileId: liaClass.teacher_profile_id,
        role: "district_liaison",
        isPrimaryTeacher: false,
        isDistrictLiaison: true,
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


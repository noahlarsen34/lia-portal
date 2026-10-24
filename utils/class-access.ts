import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export type ClassAccessRole = "primary" | "co_teacher";

export type ClassAccess = {
    classId: string;
    primaryTeacherProfileId: string;
    role: ClassAccessRole;
    isPrimaryTeacher: boolean;
};

export async function getClassAccess(
    classId: string,
    teacherProfileId: string,
): Promise<ClassAccess | null> {
    const admin = createAdminClient();
    const { data: liaClass } = await admin
        .from("lia_classes")
        .select("id, teacher_profile_id")
        .eq("id", classId)
        .maybeSingle();

    if (!liaClass) return null;

    if (liaClass.teacher_profile_id === teacherProfileId) {
        return {
            classId: liaClass.id,
            primaryTeacherProfileId: liaClass.teacher_profile_id,
            role: "primary",
            isPrimaryTeacher: true,
        };
    }

    const { data: assignment } = await admin
        .from("lia_class_teachers")
        .select("role")
        .eq("class_id", classId)
        .eq("teacher_profile_id", teacherProfileId)
        .eq("role", "co_teacher")
        .maybeSingle();

    if (!assignment) return null;

    return {
        classId: liaClass.id,
        primaryTeacherProfileId: liaClass.teacher_profile_id,
        role: "co_teacher",
        isPrimaryTeacher: false,
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


"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClassAccess } from "@/utils/class-access";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

export async function addClassCoTeacher(classId: string, formData: FormData) {
    const { profile } = await requireTeacher();
    const access = await getClassAccess(classId, profile.id);

    if (!access?.isPrimaryTeacher) {
        redirect(`/teacher/classes/${classId}?coTeacherError=not-primary`);
    }

    const teacherProfileId = String(
        formData.get("teacher_profile_id") ?? "",
    ).trim();

    if (!teacherProfileId || teacherProfileId === profile.id) {
        redirect(`/teacher/classes/${classId}?coTeacherError=invalid-teacher`);
    }

    const admin = createAdminClient();
    const { data: liaClass } = await admin
        .from("lia_classes")
        .select("school_id")
        .eq("id", classId)
        .maybeSingle();

    const { data: teacher } = await admin
        .from("teachers")
        .select("profile_id, school_id, status")
        .eq("profile_id", teacherProfileId)
        .maybeSingle();

    if (
        !liaClass ||
        !teacher ||
        teacher.school_id !== liaClass.school_id ||
        teacher.status === "inactive"
    ) {
        redirect(`/teacher/classes/${classId}?coTeacherError=invalid-teacher`);
    }

    const { error } = await admin.from("lia_class_teachers").upsert(
        {
            class_id: classId,
            teacher_profile_id: teacherProfileId,
            role: "co_teacher",
            assigned_by: profile.id,
        },
        { onConflict: "class_id,teacher_profile_id" },
    );

    if (error) {
        redirect(`/teacher/classes/${classId}?coTeacherError=add-failed`);
    }

    revalidatePath("/teacher/classes");
    revalidatePath(`/teacher/classes/${classId}`);
    redirect(`/teacher/classes/${classId}?coTeacherSuccess=added`);
}

export async function removeClassCoTeacher(
    classId: string,
    teacherProfileId: string,
) {
    const { profile } = await requireTeacher();
    const access = await getClassAccess(classId, profile.id);

    if (!access?.isPrimaryTeacher) {
        redirect(`/teacher/classes/${classId}?coTeacherError=not-primary`);
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("lia_class_teachers")
        .delete()
        .eq("class_id", classId)
        .eq("teacher_profile_id", teacherProfileId)
        .eq("role", "co_teacher");

    if (error) {
        redirect(`/teacher/classes/${classId}?coTeacherError=remove-failed`);
    }

    revalidatePath("/teacher/classes");
    revalidatePath(`/teacher/classes/${classId}`);
    redirect(`/teacher/classes/${classId}?coTeacherSuccess=removed`);
}


"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { getClassAccess } from "@/utils/class-access";
import { createAdminClient } from "@/utils/supabase/admin";

export async function deleteLiaClass(classId: string) {
    const { profile } = await requireTeacher();
    const access = await getClassAccess(classId, profile.id);

    if (!access?.isPrimaryTeacher) {
        redirect(`/teacher/classes/${classId}?error=primary-only`);
    }

    const supabase = createAdminClient();

    const { count, error: countError } = await supabase
        .from("lia_class_students")
        .select("id", { count: "exact", head: true })
        .eq("lia_class_id", classId)
        .neq("status", "removed");

    if (countError) {
        redirect(`/teacher/classes/${classId}?error=student-check-failed`);
    }

    if ((count ?? 0) > 0) {
        redirect(`/teacher/classes/${classId}?error=class-has-students`);
    }

    const { error } = await supabase
        .from("lia_classes")
        .delete()
        .eq("id", classId);

    if (error) {
        redirect(`/teacher/classes/${classId}?error=delete-failed`);
    }

    revalidatePath("/teacher/classes");
    redirect("/teacher/classes");
}

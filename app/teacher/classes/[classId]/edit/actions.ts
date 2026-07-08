"use server";

import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";

export async function updateLiaClass(classId: string, formData: FormData) {
    const { supabase, profile } = await requireTeacher();

    const name = String(formData.get("name") ?? "").trim();
    const schoolYear = String(formData.get("school_year") ?? "").trim();
    const period = String(formData.get("period") ?? "").trim();
    const gradeLevel = String(formData.get("grade_level") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!name || !schoolYear) {
        redirect(`/teacher/classes/${classId}/edit?error=missing-fields`);
    }

    const { error } = await supabase
        .from("lia_classes")
        .update({
            name,
            school_year: schoolYear,
            period: period || null,
            grade_level: gradeLevel || null,
            status: status === "inactive" ? "inactive" : "active",
            notes: notes || null,
        })
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id);

    if (error) {
        redirect(`/teacher/classes/${classId}/edit?error=update-failed`);
    }

    redirect(`/teacher/classes/${classId}`);
}

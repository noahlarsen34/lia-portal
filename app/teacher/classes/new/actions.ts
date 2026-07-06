"use server";

import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";

export async function createLiaClass(formData: FormData) {
    const { supabase, profile } = await requireTeacher();

    const name = String(formData.get("name") ?? "").trim();
    const schoolYear = String(formData.get("school_year") ?? "").trim();
    const period = String(formData.get("period") ?? "").trim();
    const gradeLevel = String(formData.get("grade_level") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!name || !schoolYear) {
        redirect("/teacher/classes/new?error=missing-fields");
    }

    const { data: teacher } = await supabase
        .from("teachers")
        .select("id, school_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

    if (!teacher) {
        redirect("/teacher/classes/new?error=teacher-not-linked");
    }

    const { error } = await supabase.from("lia_classes").insert({
        teacher_profile_id: profile.id,
        school_id: teacher.school_id,
        name,
        school_year: schoolYear,
        period: period || null,
        grade_level: gradeLevel || null,
        status: status === "inactive" ? "inactive" : "active",
        notes: notes || null,
    });

    if (error) {
        redirect("/teacher/classes/new?error=create-failed");
    }
    
    redirect("/teacher/classes");
}

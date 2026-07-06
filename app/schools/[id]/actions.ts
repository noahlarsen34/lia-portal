"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/utils/role-guards";

export async function updateSchoolProfileNotes(
    schoolId: string,
    formData: FormData,
) {
    const { supabase } = await requireStaff(`/schools/${schoolId}`);

    const notes = String(formData.get("notes") ?? "").trim();

    const { error } = await supabase
        .from("schools")
        .update({
            notes: notes || null,
        })
        .eq("id", schoolId);

    if (error) {
        redirect(`/schools/${schoolId}?error=notes-update-failed`);
    }

    redirect(`/schools/${schoolId}?success=notes-updated`);
}

export async function deleteContact(schoolId: string, contactId: string) {
    const { supabase } = await requireAdmin(`/schools/${schoolId}`);

    await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId)
        .eq("school_id", schoolId);
    
    
    redirect(`/schools/${schoolId}`);

}

export async function deleteTeacher(schoolId: string, teacherId: string) {
    const { supabase } = await requireAdmin(`/schools/${schoolId}`);

    await supabase
        .from("teachers")
        .delete()
        .eq("id", teacherId)
        .eq("school_id", schoolId);
    
    redirect(`/schools/${schoolId}`);
}

export async function deleteActivity(schoolId: string, activityId: string) {
    const { supabase } = await requireAdmin(`/schools/${schoolId}`);

    await supabase
        .from("activities")
        .delete()
        .eq("id", activityId)
        .eq("school_id",schoolId);
    
    redirect(`/schools/${schoolId}`);
}

export async function deleteDocument(schoolId: string, documentId: string) {
    const { supabase } = await requireAdmin(`/schools/${schoolId}`);

    await supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("school_id", schoolId);
    
    redirect(`/schools/${schoolId}`);
}

export async function deleteSchool(schoolId: string) {
    const { supabase } = await requireAdmin(`/schools/${schoolId}`);

    await supabase
        .from("schools")
        .delete()
        .eq("id",schoolId);
    
    redirect("/schools");
}

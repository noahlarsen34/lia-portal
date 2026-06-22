"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

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

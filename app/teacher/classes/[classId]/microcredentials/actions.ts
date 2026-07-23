"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

async function reviewSubmission(
    classId: string,
    submissionId: string,
    status: "approved" | "rejected",
    feedback: string | null,
) {
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass){
        throw new Error("You cannot manage this class.");
    }

    const { error } = await supabase
        .from("microcredential_submissions")
        .update({
            status,
            teacher_feedback: feedback,
            reviewed_at: new Date().toISOString(),
            reviewed_by: profile.id,
        })
        .eq("id", submissionId)
        .eq("lia_class_id", classId);
    
    if (error) {
        throw new Error(error.message);
    }

    revalidatePath(`/teacher/classes/${classId}/microcredentials`)
    revalidatePath("/teacher/microcredentials");
}

export async function approveMicrocredential(
    classId: string,
    submissionId: string,
) {
    await reviewSubmission(classId, submissionId, "approved", null);
}

export async function rejectMicrocredential(
    classId: string,
    submissionId: string,
    formData: FormData,
) {
    const feedback = String(formData.get("teacherFeedback"))

    await reviewSubmission(
        classId,
        submissionId,
        "rejected",
        feedback || "Please review the assignment and submit it again."
    );
}

export async function deleteMicrocredentialSubmission(
    classId: string,
    submissionId: string,
) {
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass) {
        throw new Error("You cannot manage this class.");
    }

    const { data: submission, error: submissionError} = await supabase
        .from("microcredential_submissions")
        .select("id, file_path")
        .eq('id', submissionId)
        .eq("lia_class_id", classId)
        .maybeSingle();
    
   if (submissionError || !submission) {
        throw new Error("The submission could not be found.");
    }

    const admin = createAdminClient();

    const { error: storageError } = await admin.storage
        .from("microcredential-submissions")
        .remove([submission.file_path]);
    
    if (storageError) {
        throw new Error("The uploaded document could not be deleted.")
    }

    const { error: deleteError } = await admin
        .from("microcredential_submissions")
        .delete()
        .eq("id", submission.id)
        .eq("lia_class_id", classId);
    
    if (deleteError) {
        throw new Error("The submission could not be deleted.");
    }

    revalidatePath(`/teacher/classes/${classId}/microcredentials`);
    revalidatePath("/teacher/microcredentials");
}

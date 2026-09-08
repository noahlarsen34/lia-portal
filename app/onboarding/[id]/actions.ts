"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";

const VALID_STAGES = new Set([
    "new_interest",
    "scheduling",
    "meeting_scheduled",
    "qualified",
    "awaiting_school_signature",
    "awaiting_lia_signature",
    "fully_executed",
    "active",
    "unqualified",
    "unresponsive",
    "declined",
]);

const VALID_STATUSES = new Set(["open", "completed", "closed"]);

function getText(formData: FormData, name: string, maximum = 2000) {
    return String(formData.get(name) ?? "")
        .trim()
        .slice(0, maximum);
}

export async function updateInterestSubmission(formData: FormData) {
    const { supabase, profile } = await requireStaff();

    const submissionId = getText(formData, "submission_id", 100);
    const pipelineStage = getText(formData, "pipeline_stage", 100);
    const status = getText(formData, "status", 40);
    const assignedTo = getText(formData, "assigned_to", 100);
    const nextAction = getText(formData, "next_action", 500);
    const nextActionDueAt = getText(formData, "next_action_due_at", 20);
    const internalNotes = getText(formData, "internal_notes");

    if (
        !submissionId ||
        !VALID_STAGES.has(pipelineStage) ||
        !VALID_STATUSES.has(status) ||
        !nextAction
    ) {
        redirect(
            `/onboarding/${submissionId}?error=missing-fields`,
        );
    }

    if (assignedTo) {
        const { data: assignee } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", assignedTo)
            .in("role", ["admin", "rpm"])
            .maybeSingle();

        if (!assignee) {
            redirect(
                `/onboarding/${submissionId}?error=invalid-assignee`,
            );
        }
    }

    const isReviewDecision = [
        "qualified",
        "unqualified",
        "declined",
    ].includes(pipelineStage);

    const { error } = await supabase
        .from("school_interest_submissions")
        .update({
            pipeline_stage: pipelineStage,
            status,
            assigned_to: assignedTo || null,
            next_action: nextAction,
            next_action_due_at: nextActionDueAt || null,
            internal_notes: internalNotes || null,
            reviewed_at: isReviewDecision
                ? new Date().toISOString()
                : null,
            reviewed_by: isReviewDecision ? profile.id : null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
    
    if (error) {
        console.error("Could not update interest submissions", {
            submissionId,
            message: error.message,
        });

        redirect(
            `/onboarding/${submissionId}?error=update-failed`,
        );
    }

    revalidatePath("/onboarding");
    revalidatePath(`/onboarding/${submissionId}`);

    redirect(`/onboarding/${submissionId}?saved=true`);
}

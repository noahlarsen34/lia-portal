"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/utils/role-guards";

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
const VALID_ARCHIVE_REASONS = new Set([
    "onboarding_completed",
    "school_declined",
    "not_qualified",
    "unresponsive",
    "duplicate",
    "other",
]);

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

export async function archiveInterestSubmission(formData: FormData) {
    const { supabase, profile } = await requireStaff();
    const submissionId = getText(formData, "submission_id", 100);
    const reason = getText(formData, "archive_reason", 100);

    if (!submissionId || !VALID_ARCHIVE_REASONS.has(reason)) {
        redirect(`/onboarding/${submissionId}?error=invalid-archive`);
    }

    const { error } = await supabase
        .from("school_interest_submissions")
        .update({
            archived_at: new Date().toISOString(),
            archived_by: profile.id,
            archive_reason: reason,
            updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) {
        console.error("Could not archive interest submission", { submissionId, message: error.message });
        redirect(`/onboarding/${submissionId}?error=archive-failed`);
    }

    revalidatePath("/onboarding");
    revalidatePath(`/onboarding/${submissionId}`);
    redirect("/onboarding?visibility=active&archived=true");
}

export async function restoreInterestSubmission(formData: FormData) {
    const { supabase } = await requireStaff();
    const submissionId = getText(formData, "submission_id", 100);

    if (!submissionId) redirect("/onboarding");

    const { error } = await supabase
        .from("school_interest_submissions")
        .update({
            archived_at: null,
            archived_by: null,
            archive_reason: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) {
        console.error("Could not restore interest submission", { submissionId, message: error.message });
        redirect(`/onboarding/${submissionId}?error=restore-failed`);
    }

    revalidatePath("/onboarding");
    revalidatePath(`/onboarding/${submissionId}`);
    redirect(`/onboarding/${submissionId}?restored=true`);
}

export async function deleteInterestSubmission(formData: FormData) {
    const submissionId = getText(formData, "submission_id", 100);
    const confirmation = getText(formData, "confirmation", 300);
    const { supabase } = await requireAdmin(`/onboarding/${submissionId}`);

    const { data: submission } = await supabase
        .from("school_interest_submissions")
        .select("school_name")
        .eq("id", submissionId)
        .maybeSingle();

    if (!submission || confirmation !== submission.school_name) {
        redirect(`/onboarding/${submissionId}?error=delete-confirmation`);
    }

    const { error } = await supabase
        .from("school_interest_submissions")
        .delete()
        .eq("id", submissionId);

    if (error) {
        console.error("Could not delete interest submission", { submissionId, message: error.message });
        redirect(`/onboarding/${submissionId}?error=delete-failed`);
    }

    revalidatePath("/onboarding");
    redirect("/onboarding?visibility=active&deleted=true");
}

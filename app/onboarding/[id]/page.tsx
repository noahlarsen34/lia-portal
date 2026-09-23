import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import type { ReactNode } from "react";
import { ReviewAndNextAction } from "./review-and-next-action";
import { completeLaunchMeeting, reopenLaunchMeeting } from "./actions";

type SubmissionPageProps = {
    params: Promise<{id: string }>;
    searchParams: Promise<{
        saved?: string;
        restored?: string;
        meeting?: string;
        error?: string;
    }>;
};

export default async function SubmissionPage({
    params,
    searchParams,
}: SubmissionPageProps) {
    const { id } = await params;
    const { saved, restored, meeting, error } = await searchParams;
    const { supabase, profile } = await requireStaff();

    const [{ data: submission }, { data: staff }] =
        await Promise.all([
            supabase
                .from("school_interest_submissions")
                .select("*")
                .eq("id", id)
                .maybeSingle(),
            supabase
                .from("profiles")
                .select("id, full_name, email, role")
                .in("role", ["admin", "rpm"])
                .order("full_name"),
        ]);
    
    if (!submission) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href="/onboarding"
                        className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to onboarding
                    </Link>

                    <div className="mt-5">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                            Interest submission
                        </p>

                        <h1 className="mt-2 text-3xl font-semibold">
                            {submission.school_name}
                        </h1>

                        <p className="mt-2 text-sm text-zinc-600">
                            Submitted{" "}
                            {new Date(
                                submission.submitted_at,
                            ).toLocaleString("en-US")}
                        </p>
                    </div>

                    {saved || restored || meeting ? (
                        <p
                            role="status"
                            className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                        >
                            {restored
                                ? "The onboarding record was restored."
                                : meeting === "completed"
                                    ? "Launch meeting marked complete. The MOU preview is now available."
                                    : meeting === "reopened"
                                        ? "Launch meeting reopened."
                                : "Onboarding record updated."}
                        </p>
                    ) : null}

                    {error ? (
                        <p
                            role="alert"
                            className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error === "missing-fields"
                                ? "Complete the stage, status, and next action."
                                : error === "complete-meeting-first"
                                    ? "Mark the launch meeting complete before previewing the MOU."
                                    : error === "launch-meeting-failed"
                                        ? "The launch meeting could not be updated. Run the MOU interface SQL migration if you have not already."
                                : error === "invalid-assignee"
                                    ? "Select a valid staff member."
                                    : error === "invalid-archive"
                                        ? "Select a reason before archiving this record."
                                        : error === "archive-failed"
                                            ? "The record could not be archived. Run the onboarding archive SQL migration if you have not already."
                                            : error === "restore-failed"
                                                ? "The record could not be restored."
                                                : error === "delete-confirmation"
                                                    ? "The school name did not match. The record was not deleted."
                                                    : error === "delete-failed"
                                                        ? "The record could not be permanently deleted."
                                    : "The record could not be updated."}
                        </p>
                    ) : null}

                    <section className="mt-6 rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">MOU workflow</p>
                                <h2 className="mt-1 text-xl font-semibold">1. Launch meeting</h2>
                                <p className="mt-1 text-sm text-zinc-600">
                                    {submission.launch_meeting_completed_at
                                        ? `Completed ${new Date(submission.launch_meeting_completed_at).toLocaleDateString("en-US")}`
                                        : "Complete the launch meeting to unlock the MOU preview."}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {submission.launch_meeting_completed_at ? (
                                    <>
                                        <form action={reopenLaunchMeeting}>
                                            <input type="hidden" name="submission_id" value={submission.id} />
                                            <button type="submit" className="h-11 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Reopen meeting</button>
                                        </form>
                                        <Link href={`/onboarding/${submission.id}/mou`} className="inline-flex h-11 items-center rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]">Preview MOU</Link>
                                    </>
                                ) : (
                                    <form action={completeLaunchMeeting}>
                                        <input type="hidden" name="submission_id" value={submission.id} />
                                        <button type="submit" className="h-11 rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]">Mark launch meeting complete</button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                        <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="text-xl font-semibold">
                                Submitted information
                            </h2>

                            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                                <Info
                                    label="School"
                                    value={submission.school_name}
                                />
                                <Info
                                    label="District"
                                    value={submission.district_name}
                                />
                                <Info
                                    label="Address"
                                    value={submission.city}
                                />
                                <Info
                                    label="State"
                                    value={submission.state}
                                />
                                <Info
                                    label="Region"
                                    value={submission.region}
                                />
                                <Info
                                    label="Website"
                                    value={submission.website}
                                />
                                <Info
                                    label="Applicant"
                                    value={`${submission.contact_first_name} ${submission.contact_last_name}`}
                                />
                                <Info
                                label="Job title"
                                value={submission.contact_title}
                                />
                                <Info
                                label="Email"
                                value={submission.contact_email}
                                />
                                <Info
                                label="Phone"
                                value={submission.contact_phone}
                                />
                                <Info
                                label="Principal"
                                value={submission.principal_name}
                                />
                                <Info
                                label="Principal email"
                                value={submission.principal_email}
                                />
                                <Info
                                label="Decision-maker"
                                value={
                                    submission.is_decision_maker
                                    ? "Yes"
                                    : "No or not confirmed"
                                }
                                />
                                <Info
                                label="Grades"
                                value={submission.grade_levels?.join(", ")}
                                />
                                <Info
                                label="Estimated students"
                                value={
                                    submission.estimated_student_count?.toString()
                                }
                                />
                                <Info
                                label="Desired start"
                                value={submission.desired_start_term}
                                />
                                <Info
                                label="Funding"
                                value={submission.funding_status}
                                />
                                <Info
                                label="Referral source"
                                value={submission.referral_source}
                                />
                                <Info
                                label="Authorized MOU signer"
                                value={submission.signer_name}
                                />
                                <Info
                                label="MOU signer email"
                                value={submission.signer_email}
                                />
                                <Info
                                label="Billing email"
                                value={submission.billing_email}
                                />
                            </dl>

                            {submission.notes ? (
                                <div className="mt-6 border-t border-zinc-100 pt-5">
                                    <h3 className="text-sm font-semibold text-zinc-700">
                                        Additional context
                                    </h3>

                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                                        {submission.notes}
                                    </p>
                                </div>
                            ) : null}
                        </section>

                        <ReviewAndNextAction
                            initialEditing={[
                                "missing-fields",
                                "invalid-assignee",
                                "update-failed",
                            ].includes(error ?? "")}
                            review={{
                                id: submission.id,
                                assignedTo: submission.assigned_to,
                                assignedToName: submission.assigned_to
                                    ? staff?.find(
                                        (person) => person.id === submission.assigned_to,
                                    )?.full_name ?? null
                                    : null,
                                pipelineStage: submission.pipeline_stage,
                                status: submission.status,
                                nextAction: submission.next_action,
                                nextActionDueAt: submission.next_action_due_at,
                                internalNotes: submission.internal_notes,
                                schoolName: submission.school_name,
                                archivedAt: submission.archived_at,
                                archiveReason: submission.archive_reason,
                            }}
                            canDelete={profile.role === "admin"}
                            staff={(staff ?? []).map((person) => ({
                                id: person.id,
                                name:
                                    person.full_name ??
                                    person.email ??
                                    "Unnamed staff member",
                            }))}
                        />
                    </div>
                </div>
            </section>
        </main>
    );
}



type InfoProps = {
    label: string;
    value?: ReactNode;
};

function Info({ label, value }: InfoProps) {
    const hasValue = value !== null && value !== undefined && value !== "";

    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {label}
            </dt>
            <dd className="mt-1 break-words text-sm text-zinc-800">
                {hasValue ? value : "Not provided"}
            </dd>
        </div>
    );
}

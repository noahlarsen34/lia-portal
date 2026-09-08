import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import type { ReactNode } from "react";
import { ReviewAndNextAction } from "./review-and-next-action";

type SubmissionPageProps = {
    params: Promise<{id: string }>;
    searchParams: Promise<{
        saved?: string;
        error?: string;
    }>;
};

export default async function SubmissionPage({
    params,
    searchParams,
}: SubmissionPageProps) {
    const { id } = await params;
    const { saved, error } = await searchParams;
    const { supabase } = await requireStaff();

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

                    {saved ? (
                        <p
                            role="status"
                            className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                        >
                            Onboarding record updated.
                        </p>
                    ) : null}

                    {error ? (
                        <p
                            role="alert"
                            className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error === "missing-fields"
                                ? "Complete the stage, status, and next action."
                                : error === "invalid-assignee"
                                    ? "Select a valid staff member."
                                    : "The record could not be updated."}
                        </p>
                    ) : null}

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
                                    label="Location"
                                    value={`${submission.city}, ${submission.state}`}
                                />
                                <Info
                                    label="Website"
                                    value={submission.website}
                                />
                                <Info
                                    label="Primary Contact"
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
                                label="Authorized signer"
                                value={submission.signer_name}
                                />
                                <Info
                                label="Signer email"
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
                            initalEditing={Boolean(error)}
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
                            }}
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

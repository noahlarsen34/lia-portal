import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { updateInterestSubmission } from "./actions";
import type { ReactNode } from "react";

type SubmissionPageProps = {
    params: Promise<{id: string }>;
    searchParams: Promise<{
        saved?: string;
        error?: string;
    }>;
};

const pipelineStages = [
    ["new_interest", "New Interest"],
    ["scheduling", "Scheduling"],
    ["meeting_scheduled", "Meeting Scheduled"],
    ["qualified", "Qualified"],
    ["awaiting_school_signature", "Awaiting School Signature"],
    ["awaiting_lia_signature", "Awating LIA Signature"],
    ["fully_executed", "Fully Executed"],
    ["active", "Active"],
    ["unqualified", "Unqualified"],
    ["unresponsive", "Unresponsive"],
    ["declined", "Declined"],
] as const;

const fieldClass =
    "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100";

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

                        <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="text-xl font-semibold">
                                Review and next action
                            </h2>

                            <form
                                action={updateInterestSubmission}
                                className="mt-5 space-y-5"
                            >
                                <input
                                    type="hidden"
                                    name="submission_id"
                                    value={submission.id}
                                />

                                <label className="block text-sm font-medium text-zinc-700">
                                    Assigned staff member
                                    <select
                                        name="assigned_to"
                                        defaultValue={submission.assigned_to ?? ""}
                                        className={fieldClass}
                                    >
                                        <option value="">Unassigned</option>

                                        {(staff ?? []).map((person) => (
                                            <option key={person.id} value={person.id}>
                                                {person.full_name ??
                                                    person.email ??
                                                    "Unnamed staff member"}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block text-sm font-medium text-zinc-700">
                                    Pipeline stage *
                                    <select
                                        name="pipeline_stage"
                                        defaultValue={submission.pipeline_stage}
                                        className={fieldClass}
                                        required
                                    >
                                        {pipelineStages.map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block text-sm font-medium text-zinc-700">
                                    Record status *
                                    <select
                                        name="status"
                                        defaultValue={submission.status}
                                        className={fieldClass}
                                        required
                                    >
                                        <option value="open">Open</option>
                                        <option value="completed">Completed</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </label>

                                <label className="block text-sm font-medium text-zinc-700">
                                    Next action *
                                    <input
                                        name="next_action"
                                        defaultValue={submission.next_action}
                                        className={fieldClass}
                                        required
                                    />
                                </label>

                                <label className="block text-sm font-medium text-zinc-700">
                                    Next-action due date
                                    <input
                                        name="next_action_due_at"
                                        type="date"
                                        defaultValue={
                                            submission.next_action_due_at ?? ""
                                        }
                                        className={fieldClass}
                                    />
                                </label>

                                <label className="block text-sm font-medium text-zinc-700">
                                    Internal notes
                                    <textarea
                                        name="internal_notes"
                                        defaultValue={submission.internal_notes ?? ""}
                                        className="mt-2 min-h-40 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        maxLength={2000}
                                    />
                                </label>

                                <button
                                    type="submit"
                                    className="h-11 w-full rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                                >
                                    Save review
                                </button>
                            </form>
                        </section>
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

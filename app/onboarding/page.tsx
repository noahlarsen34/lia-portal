import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { ONBOARDING_STAGES, ONBOARDING_STAGE_LABELS } from "@/utils/onboarding-stages";

type OnboardingPageProps = {
    searchParams: Promise<{
        stage?: string;
        visibility?: string;
        archived?: string;
        deleted?: string;
    }>;
};

export default async function OnboardingPage({
    searchParams,
} : OnboardingPageProps) {
    const { stage, visibility, archived, deleted } = await searchParams;
    const { supabase } = await requireStaff();
    const selectedVisibility = ["active", "archived", "all"].includes(visibility ?? "")
        ? visibility!
        : "active";

    let query = supabase
        .from("school_interest_submissions")
        .select(`
            id,
            school_name,
            district_name,
            city,
            state,
            contact_first_name,
            contact_last_name,
            contact_email,
            pipeline_stage,
            next_action,
            next_action_due_at,
            status,
            submitted_at,
            assigned_to,
            archived_at,
            archive_reason
        `)
        .order("submitted_at", { ascending: false })
    
    if (stage && stage !== "all") {
        query = query.eq("pipeline_stage", stage);
    }

    if (selectedVisibility === "active") {
        query = query.is("archived_at", null);
    } else if (selectedVisibility === "archived") {
        query = query.not("archived_at", "is", null);
    }

    const [{data: submissions, error}, { data: staff}] =
        await Promise.all([
            query,
            supabase
                .from("profiles")
                .select("id, full_name")
                .in("role", ["admin", "rpm"]),
        ]);
    
    if (error) {
        throw new Error(
            `Unable to load onboarding submissions: ${error.message}`,
        );
    }

    const staffNames = new Map(
        (staff ?? []).map((person) => [
            person.id,
            person.full_name,
        ]),
    );

    const today = new Date().toISOString().slice(0,10);

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                                School onboarding
                            </p>

                            <h1 className="mt-2 text-3xl font-semibold">
                                Onboarding Inbox
                            </h1>

                            <p className="mt-2 text-sm text-zinc-600">
                                Review interest forms, assign staff, and manage
                                each school&apos;s next action.
                            </p>
                        </div>

                        <Link
                            href="/onboarding/interest-form"
                            className="inline-flex h-11 items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-[#c8102e] hover:bg-red-50"
                        >
                            Share Interest Form
                        </Link>
                    </div>

                    {archived ? (
                        <p role="status" className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                            The onboarding record was archived.
                        </p>
                    ) : null}

                    {deleted ? (
                        <p role="status" className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                            The onboarding record was permanently deleted.
                        </p>
                    ) : null}

                    <form className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
                        <select
                            name="visibility"
                            defaultValue={selectedVisibility}
                            aria-label="Record visibility"
                            className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm sm:w-44"
                        >
                            <option value="active">Active records</option>
                            <option value="archived">Archived records</option>
                            <option value="all">All records</option>
                        </select>

                        <select
                            name="stage"
                            defaultValue={stage ?? "all"}
                            aria-label="Pipeline stage"
                            className="h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm"
                        >
                            <option value="all">All stages</option>

                            {ONBOARDING_STAGES.map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>

                        <button
                            type="submit"
                            className="rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Filter
                        </button>
                    </form>

                    <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                        {(submissions ?? []).length === 0 ? (
                            <div className="p-10 text-center text-sm text-zinc-600">
                                No onboarding submissions match this filter.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[950px] text-left text-sm">
                                    <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600">
                                        <tr>
                                            <th className="px-5 py-4">School</th>
                                            <th className="px-5 py-4">Applicant</th>
                                            <th className="px-5 py-4">Stage</th>
                                            <th className="px-5 py-4">Assigned to</th>
                                            <th className="px-5 py-4">Next action</th>
                                            <th className="px-5 py-4">Received</th>
                                            <th className="px-5 py-4">
                                                <span className="sr-only">View</span>
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-zinc-100">
                                        {(submissions ?? []).map((submission) => {
                                            const overdue =
                                                !submission.archived_at &&
                                                submission.status === "open" &&
                                                submission.next_action_due_at &&
                                                submission.next_action_due_at < today;
                                            
                                            return (
                                                <tr
                                                    key={submission.id}
                                                    className={submission.archived_at ? "bg-zinc-50 text-zinc-600 hover:bg-zinc-100" : "hover:bg-red-50/30"}
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="font-semibold text-zinc-950">
                                                            {submission.school_name}
                                                        </div>

                                                        <div className="mt-1 text-xs text-zinc-500">
                                                            {submission.city} · {submission.state}
                                                        </div>
                                                        {submission.archived_at ? (
                                                            <div className="mt-2 inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
                                                                Archived
                                                            </div>
                                                        ) : null}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <div>
                                                            {submission.contact_first_name}{" "}
                                                            {submission.contact_last_name}
                                                        </div>

                                                        <div className="mt-1 text-xs text-zinc-500">
                                                            {submission.contact_email}
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                                                            {ONBOARDING_STAGE_LABELS[
                                                                submission.pipeline_stage as keyof typeof ONBOARDING_STAGE_LABELS
                                                            ] ?? submission.pipeline_stage}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4 text-zinc-600">
                                                        {submission.assigned_to
                                                            ? staffNames.get(
                                                                submission.assigned_to,
                                                            ) ?? "Unknown"
                                                            : "Unassigned"}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <div className={overdue ? "font-semibold text-red-700" : "text-zinc-700"}>
                                                            {submission.next_action}
                                                        </div>

                                                        {submission.next_action_due_at ? (
                                                            <div className="mt-1 text-xs text-zinc-500">
                                                                Due{" "}
                                                                {new Date(
                                                                    `${submission.next_action_due_at}T12:00:00`,
                                                                ).toLocaleDateString('en-US')}
                                                                {overdue ? " · Overdue" : ""}
                                                            </div>
                                                        ) : null}
                                                    </td>

                                                    <td className="px-5 py-4 text-zinc-600">
                                                        {new Date(
                                                            submission.submitted_at,
                                                        ).toLocaleDateString("en-US")}
                                                    </td>

                                                    <td className="px-5 py-4 text-right">
                                                        <Link
                                                            href={`/onboarding/${submission.id}`}
                                                            className="font-semibold text-[#c8102e] hover:text-[#a70d25]"
                                                        >
                                                            {submission.archived_at ? "View" : "Review"}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

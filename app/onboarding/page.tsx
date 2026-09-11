import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";

type OnboardingPageProps = {
    searchParams: Promise<{
        stage?: string;
    }>;
};

const stageLabels: Record<string, string> = {
    new_interest: "New Interest",
    scheduling: "Scheduling",
    meeting_scheduled: "Meeting Scheduled",
    qualified: "Qualified",
    awaiting_school_signature: "Awaiting School Signature",
    awaiting_lia_signature: "Awaiting LIA Signature",
    fully_executed: "Fully Executed",
    active: "Active",
    unqualified: "Unqualified",
    unresponsive: "Unresponsive",
    declined: "Declined",
};

export default async function OnboardingPage({
    searchParams,
} : OnboardingPageProps) {
    const { stage } = await searchParams;
    const { supabase } = await requireStaff();

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
            assigned_to
        `)
        .order("submitted_at", { ascending: false })
    
    if (stage && stage !== "all") {
        query = query.eq("pipeline_stage", stage);
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

                    <form className="mt-6 flex max-w-sm gap-3">
                        <select
                            name="stage"
                            defaultValue={stage ?? "all"}
                            className="h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm"
                        >
                            <option value="all">All stages</option>

                            {Object.entries(stageLabels).map(
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
                                                submission.status === "open" &&
                                                submission.next_action_due_at &&
                                                submission.next_action_due_at < today;
                                            
                                            return (
                                                <tr
                                                    key={submission.id}
                                                    className="hover:bg-red-50/30"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="font-semibold text-zinc-950">
                                                            {submission.school_name}
                                                        </div>

                                                        <div className="mt-1 text-xs text-zinc-500">
                                                            {submission.city} · {submission.state}
                                                        </div>
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
                                                            {stageLabels[
                                                                submission.pipeline_stage
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
                                                            Review
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

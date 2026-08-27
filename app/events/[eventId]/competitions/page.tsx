import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    Award,
    Eye,
    Star,
    Trophy,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { CompetitionFilters } from "./competition-filters";

type CompetitionPageProps = {
    params: Promise<{
        eventId: string;
    }>;
    searchParams: Promise<{
        q?: string;
        category?: string;
        school?: string;
        status?: string;
    }>;
};

function relation<T>(
    value: T | T[] | null | undefined,
): T | null {
    return Array.isArray(value)
        ? value[0] ?? null
        : value ?? null;
}

function resultBadge(entry: {
    is_finalist: boolean;
    is_winner: boolean;
    prize_placement: number | null;
}) {
    if (entry.is_winner) {
        return {
            label : entry.prize_placement
                ? `Winner · Place ${entry.prize_placement}`
                : "Winner",
            className:
                "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
        };
    }

    if (entry.is_finalist) {
        return {
            label: "Finalist",
            className:
                "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200",
        };
    }

    return {
        label: "Submitted",
        className:
            "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200",
    };
}

export default async function EventCompetitionsPage({
    params,
    searchParams,
}: CompetitionPageProps) {
    const { eventId } = await params;
    const filters = await searchParams;

    await requireStaff();

    const admin = createAdminClient();

    const [eventResult, entriesResult] = await Promise.all([
        admin
            .from("lia_events")
            .select(`
                    id,
                    name,
                    event_date,
                    event_type  
                `)
            .eq("id", eventId)
            .maybeSingle(),
        
        admin
            .from("event_competition_entries")
            .select(`
                id,
                category,
                title,
                external_url,
                created_at,
                is_finalist,
                is_winner,
                prize_placement,
                prize_amount,
                event_competition_reviews (
                    id,
                    rating,
                    reviewer_profile_id,
                    profiles (
                        full_name
                    )
                ),
                event_registrations!inner (
                    id,
                    event_id,
                    first_name,
                    last_name,
                    student_email,
                    schools (
                        id,
                        name
                    )
                )
            `)
            .eq("event_registrations.event_id", eventId)
            .order("created_at", {
                ascending: false
            }),
    ]);

    if (eventResult.error) {
        throw new Error(eventResult.error.message);
    }

    if (!eventResult.data) {
        notFound();
    }

    if (entriesResult.error) {
        throw new Error(entriesResult.error.message);
    }

    const event = eventResult.data;
    const entries = entriesResult.data ?? [];

    const q = (filters.q ?? "").trim().toLowerCase();

    const filteredEntries = entries.filter((entry) => {
        const registration = relation(entry.event_registrations);
        const school = relation(registration?.schools);
        const reviews = entry.event_competition_reviews ?? [];

        const averageRating =
            reviews.length  > 0
                ? reviews.reduce(
                      (total, review) => total + review.rating,
                      0,
                  ) / reviews.length
                : null;
        
        const searchableText = [
            entry.title,
            entry.category,
            registration?.first_name,
            registration?.last_name,
            registration?.student_email,
            school?.name,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        
        const matchesSearch =
            !q || searchableText.includes(q)
        
        const matchesCategory =
            !filters.category ||
            entry.category === filters.category;
        
        const matchesSchool =
            !filters.school ||
            school?.id === filters.school;
        
        let matchesStatus = true;

        switch (filters.status) {
            case "unreviewed":
                matchesStatus = reviews.length === 0;
                break;
            
            case "reviewed":
                matchesStatus = reviews.length > 0;
                break;
            
            case "high-rating":
                matchesStatus =
                    averageRating !== null &&
                    averageRating >= 4;
                break;
            
            case "finalist":
                matchesStatus = 
                    entry.is_finalist &&
                    !entry.is_winner;
                break;
            
            case "winner":
                matchesStatus = entry.is_winner;
                break;
        }

        return (
            matchesSearch &&
            matchesCategory &&
            matchesSchool &&
            matchesStatus
        );
    });
    
    const categories = Array.from(
        new Set(entries.map((entry) => entry.category)),
    ).sort();

    const schoolMap = new Map<string, string>();

    for (const entry of entries) {
        const registration = relation(
            entry.event_registrations,
        );
        const school = relation(registration?.schools);

        if (school) {
            schoolMap.set(school.id, school.name);
        }
    }

    const reviewedCount = entries.filter(
        (entry) =>
        (entry.event_competition_reviews ?? []).length > 0,
    ).length;

    const finalistCount = entries.filter(
        (entry) => entry.is_finalist,
    ).length;

    const winnerCount = entries.filter(
        (entry) => entry.is_winner,
    ).length;

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <Link
                        href={`/events/${eventId}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#c8102e] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Event management
                    </Link>

                    <header className="mt-5">
                        <p className="text-sm font-bold uppercase tracking-wide text-[#c8102e]">
                            Competition management
                        </p>

                        <h1 className="mt-2 text-3xl font-semibold">
                            {event.name}
                        </h1>

                        <p className="mt-2 tetx-sm text-zinc-600">
                            Review ratings, finalists, winners, and prize information.
                        </p>
                    </header>

                    <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <Award className="h-5 w-5 text-[#c8102e]" />

                            <p className="mt-4 text-3xl font-bold">
                                {entries.length}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                                Total entries
                            </p>
                        </article>

                        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <Star className="h-5 w-5 text-[#c8102e]" />

                            <p className="mt-4 text-3xl font-bold">
                                {reviewedCount}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                                Entries reviewed
                            </p>
                        </article>

                        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <Award className="h-5 w-5 text-[#c8102e]" />

                            <p className="mt-4 text-3xl font-bold">
                                {finalistCount}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                                Finalists
                            </p>
                        </article>

                        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <Trophy className="h-5 w-5 text-[#c8102e]" />

                            <p className="mt-4 text-3xl font-bold">
                                {winnerCount}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                                Winners
                            </p>
                        </article>
                    </section>

                    <CompetitionFilters
                        eventId={eventId}
                        initialQuery={filters.q ?? ""}
                        initialCategory={filters.category ?? ""}
                        initialSchool={filters.school ?? ""}
                        initialStatus={filters.status ?? ""}
                        categories={categories}
                        schools={Array.from(schoolMap.entries())
                            .sort((a, b) => a[1].localeCompare(b[1]))
                            .map(([value, label]) => ({ value, label }))}
                    />

                    <section className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        {[
                                            "Student",
                                            "Entry",
                                            "School",
                                            "Staff ratings",
                                            "Average",
                                            "Result",
                                            "",
                                        ].map((heading) => (
                                            <th
                                                key={heading || "actions"}
                                                className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500"
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divie-y divide-zinc-100">
                                    {filteredEntries.map((entry) => {
                                        const registration = relation(entry.event_registrations);

                                        const school = relation(
                                            registration?.schools,
                                        );

                                        const reviews = entry.event_competition_reviews ?? [];

                                        const averageRating =
                                            reviews.length > 0
                                                ? reviews.reduce(
                                                    (
                                                        total,
                                                        review,
                                                    ) =>
                                                        total +
                                                        review.rating,
                                                    0,
                                                ) / reviews.length
                                                : null;
                                        
                                        const result =
                                            resultBadge(entry);
                                                
                                        return (
                                            <tr
                                                key={entry.id}
                                                className="align-top hover:bg-zinc-50/70"
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="whitepsace-nowrap font-semibold">
                                                        {registration
                                                            ? `${registration.first_name} ${registration.last_name}`
                                                            : 'Unavailable'}                                                       
                                                    </p>

                                                    <p className="mt-1 text-sm text-zinc-500">
                                                        {registration?.student_email ??
                                                            ""}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-[#c8102e]">
                                                        {entry.title}
                                                    </p>

                                                    <p className="mt-1 text-sm text-zinc-500">
                                                        {entry.category}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-sm">
                                                    {school?.name ??
                                                        "Unavailable"}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {reviews.length > 0 ? (
                                                        <div className="flex min-w-52 flex-wrap gap-2">
                                                            {reviews.map(
                                                                (
                                                                    review,
                                                                ) => {
                                                                    const reviewer =
                                                                        relation(
                                                                            review.profiles,
                                                                        );
                                                                    return (
                                                                        <span
                                                                            key={review.id}
                                                                            title={
                                                                                reviewer?.full_name ??
                                                                                "Staff reviewer"
                                                                            }
                                                                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
                                                                        >
                                                                            <Star className="h-3.5 w-3.5 fill-current" />

                                                                            {review.rating}/5

                                                                            <span className="max-w-24 truncate text-amber-700/75">
                                                                                {reviewer?.full_name ??
                                                                                    "Staff"}
                                                                            </span>
                                                                        </span>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-zinc-400">
                                                            Not reviewed
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {averageRating !==
                                                    null ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
                                                            <Star className="h-4 w-4 fill-current" />
                                                            {averageRating.toFixed(
                                                                1,
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-zinc-400">
                                                            -
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${result.className}`}>
                                                        {result.label}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        href={`/events/${eventId}/competitions/${entry.id}`}
                                                        className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Review
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })} 

                                    {filteredEntries.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-5 py-14 text-center text-sm text-zinc-500"
                                            >
                                                No competition entries
                                                match these filters.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    )
}

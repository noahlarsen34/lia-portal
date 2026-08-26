import Link from "next/link";
import { notFound } from "next/navigation";
import { 
    ArrowLeft,
    Download,
    ExternalLink,
    FileText,
    Medal,
    Star,
    Trophy,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    saveCompetitionOutcome,
    saveCompetitionReview,
} from "./actions";

type PageProps = {
    params: Promise<{
        eventId: string;
        entryId: string;
    }>;
    searchParams: Promise<{
        saved?: string;
        error?: string;
    }>;
};

function relation<T>(
    value: T | T[] | null | undefined,
): T | null {
    return Array.isArray(value)
        ? value[0] ?? null
        : value ?? null;
}

function formatFileSize(bytes: number | null) {
    if (!bytes) {
        return "";
    }

    if (bytes < 1024 * 1024) {
        return `${Math.ceil(bytes / 1024)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: string | undefined) {
    switch (error) {
        case "invalid-rating":
            return "Select a rating from 1 to 5 stars.";
        case "notes-too-long":
            return "Private notes must be 10,000 characters or fewer.";
        case "review-failed":
            return "Your review could not be saved.";
        case "invalid-placement":
            return "Prize placement must be a whole number";
        case "invalid-prize":
            return "Prize amount must be zero or greater.";
        case "winner-required":
            return "Mark the entry as a winner before entering prize information.";
        case "outcome-failed":
            return "The competition result could not be saved.";
        default:
            return null;
    }
} 

export default async function CompetitionReviewPage({
    params,
    searchParams,
} : PageProps) {
    const { eventId, entryId } = await params;
    const query = await searchParams;
    const { profile } = await requireStaff();

    const admin = createAdminClient();

    const { data: entry, error: entryError } = await admin
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
                event_registration_files (
                    id,
                    bucket_name,
                    file_path,
                    original_file_name,
                    mime_type,
                    file_size
                ),
                event_competition_reviews (
                    id,
                    reviewer_profile_id,
                    rating,
                    private_notes,
                    updated_at,
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
                    grade_level,
                    schools (
                        name,
                        state
                    ),
                    teachers (
                        first_name,
                        last_name,
                        name
                    ),
                    lia_events (
                        name,
                        event_type
                    )
                ) 
            `)
            .eq("id", entryId)
            .eq("event_registrations.event_id", eventId)
            .maybeSingle();
    
    if (entryError) {
        throw new Error(
            `Unable to load competition entry: ${entryError.message}`,
        );
    }

    if (!entry) {
        notFound();
    }

    const registration = relation(entry.event_registrations);

    if (!registration || registration.event_id !== eventId) {
        notFound();
    }
    
    const event = relation(registration.lia_events);

    if (!event || event.event_type !== "conference") {
        notFound();
    }

    const school = relation(registration.schools);
    const teacher = relation(registration.teachers);

    const reviews = entry.event_competition_reviews ?? [];

    const currentReview = reviews.find(
        (review) =>
            review.reviewer_profile_id === profile.id,
    );

    const averageRating =
        reviews.length > 0
            ? reviews.reduce(
                (total, review) => total + review.rating,
                0,
            ) / reviews.length
            : null;
    
    const files = await Promise.all(
        (entry.event_registration_files ?? []).map(
            async (file) => {
                const { data, error } = await admin.storage
                    .from(file.bucket_name)
                    .createSignedUrl(file.file_path, 60 * 10);
                
                return {
                    ...file,
                    signedUrl: error
                        ? null
                        : data?.signedUrl ?? null,
                };
            }
        )
    )

    const reviewAction = saveCompetitionReview.bind(
        null,
        eventId,
        entryId
    );

    const outcomeAction = saveCompetitionOutcome.bind(
        null,
        eventId,
        entryId,
    );

    const message = errorMessage(query.error);

    const teacherName =
        teacher
            ? [teacher.first_name, teacher.last_name]
                .filter(Boolean)
                .join(" ") ||
                teacher.name ||
                "Unavailable"
            : "Unavailable"

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href={`/events/${eventId}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#c8102e] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Event management
                    </Link>

                    <header className="mt-6 rounded-2xl bg-gradient-to-br from-[#a90925] to-[#e32246] p-7 text-white shadow-lg">
                        <p className="text-sm font-bold uppercase tracking-wide text-white/75">
                            Competition review
                        </p>

                        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                            {entry.title || "Untitled entry"}
                        </h1>

                        <p className="mt-3 text-white/80">
                            {entry.category} · {event.name}
                        </p>
                    </header>

                    {message ? (
                        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            {message}
                        </div>
                    ) : null}
                    
                    {query.saved ? (
                        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                            Competition review updated successfully.
                        </div>
                    ) : null}

                    <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-2">
                        <div className="contents">
                            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-start-1 lg:row-start-1">
                                <h2 className="text-xl font-semibold">
                                    Student
                                </h2>

                                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs font-bold uppercase text-zinc-500">
                                            Name
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {registration.first_name}{" "}
                                            {registration.last_name}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs font-bold uppercase text-zinc-500">
                                            School
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {school?.name ?? "Unavailable"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs font-bold uppercase text-zinc-500">
                                            Teacher
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {teacherName}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs font-bold uppercase text-zinc-500">
                                            Grade
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {registration.grade_level ??
                                                "Unavailable"}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-start-1 lg:row-start-2">
                                <h2 className="text-xl font-semibold">
                                    Submitted work
                                </h2>

                                {entry.external_url ? (
                                    <a
                                        href={entry.external_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 font-semibold text-[#c8102e] hover:bg-red-100"
                                    >
                                        Open submitted link
                                        <ExternalLink className="h-5 w-5" />
                                    </a>
                                ) : null}

                                <div className="mt-5 space-y-3">
                                    {files.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <FileText className="h-5 w-5 shrink-0 text-zinc-500" />

                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold">
                                                        {file.original_file_name}
                                                    </p>

                                                    <p className="text-xs text-zinc-500">
                                                        {formatFileSize(
                                                            file.file_size,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {file.signedUrl ? (
                                                <a
                                                    href={file.signedUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#c8102e]"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Open
                                                </a>
                                            ) : (
                                                <span className="text-sm text-red-600">
                                                    Unavailable
                                                </span>
                                            )}
                                        </div>
                                    ))}

                                    {!entry.external_url &&
                                    files.length === 0 ? (
                                        <p className="rounded-lg bg-zinc-50 p-5 text-sm text-zinc-500">
                                            No submitted file or link is available.
                                        </p>
                                    ) : null}
                                </div>
                            </section> 

                        </div>

                        <aside className="contents">
                            <form
                                action={reviewAction}
                                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-start-2 lg:row-start-1"
                            >
                                <h2 className="text-xl font-semibold">
                                    Your review
                                </h2>

                                <label className="mt-5 block">
                                    <span className="text-sm font-semibold">
                                        Rating
                                    </span>

                                    <select
                                        name="rating"
                                        required
                                        defaultValue={
                                            currentReview?.rating
                                                ? String(
                                                    currentReview.rating,
                                                )
                                                : ""
                                        }
                                        className="mt-2 h-11 w-full rounded-lg border border-zinc-300 px-3"
                                    >
                                        <option value="" disabled>
                                            Select rating
                                        </option>
                                        <option value="1">1 star</option>
                                        <option value="2">2 star</option>
                                        <option value="3">3 star</option>
                                        <option value="4">4 star</option>
                                        <option value="5">5 star</option>
                                    </select>
                                </label>

                                <label className="mt-5 block">
                                    <span className="text-sm font-semibold">
                                        Private judging notes
                                    </span>

                                    <textarea
                                        name="private_notes"
                                        rows={5}
                                        maxLength={10000}
                                        defaultValue={
                                            currentReview?.private_notes ??
                                            ""
                                        }
                                        className="mt-2 w-full rounded-lg border border-zinc-300 p-3"
                                    />
                                </label>

                                <button className="mt-5 h-11 w-full rounded-lg bg-zinc-900 px-4 font-semibold text-white hover:bg-zinc-700">
                                    Save review
                                </button>
                            </form>

                            <form
                                action={outcomeAction}
                                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-start-2 lg:row-start-2"
                            >
                                <div className="flex items-center gap-3">
                                    <Trophy className="h-5 w-5 text-[#c8102e]" />
                                    <h2 className="text-xl font-semibold">
                                        Competition result
                                    </h2>
                                </div>

                                <label className="mt-5 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        name="is_finalist"
                                        defaultChecked={
                                            entry.is_finalist
                                        }
                                        className="h-5 w-5"
                                    />
                                    <span className="font-semibold">
                                        Finalist
                                    </span>
                                </label>

                                <label className="mt-4 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        name="is_winner"
                                        defaultChecked={entry.is_winner}
                                        className="h-5 w-5"
                                    />
                                    <span className="font-semibold">
                                        Winner
                                    </span>
                                </label>

                                <label className="mt-5 block">
                                    <span className="text-sm font-semibold">
                                        Prize placement
                                    </span>
                                    <input
                                        type="number"
                                        name="prize_placement"
                                        min={1}
                                        step={1}
                                        defaultValue={
                                            entry.prize_placement ?? ""
                                        }
                                        placeholder="Example: 1"
                                        className="mt-2 h-11 w-full rounded-lg border border-zinc-300 px-3"
                                    />
                                </label>

                                <label className="mt-5 block">
                                    <span className="text-sm font-semibold">
                                        Prize amount
                                    </span>

                                    <div className="relative mt-2">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                                            $
                                        </span>

                                        <input
                                            type="number"
                                            name="prize_amount"
                                            min={0}
                                            step="0.01"
                                            defaultValue={
                                                entry.prize_amount ?? ""
                                            }
                                            className="mt-2 h-11 w-full rounded-lg border border-zinc-300 pl-8 pr-3"
                                        />
                                    </div>
                                </label>

                                <button className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#c8102e] px-4 font-semibold text-white hover:bg-[#a70d25]">
                                    <Medal className="h-5 w-5" />
                                    Save result
                                </button>
                            </form>
                        </aside>
                    </div>

                    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold">
                                Staff reviews
                            </h2>

                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                                <Star className="h-4 w-4 fill-current" />
                                {averageRating !== null
                                    ? averageRating.toFixed(1)
                                    : "Not rated"}
                            </span>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {reviews.map((review) => {
                                const reviewer = relation(
                                    review.profiles,
                                );

                                return (
                                    <article
                                        key={review.id}
                                        className="rounded-lg border border-zinc-200 p-4"
                                    >
                                        <div className="flex justify-between gap-3">
                                            <p className="font-semibold">
                                                {reviewer?.full_name ??
                                                    "Staff reviewer"}
                                            </p>

                                            <p className="font-semibold text-amber-700">
                                                {review.rating}/5
                                            </p>
                                        </div>

                                        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">
                                            {review.private_notes ||
                                                "No private notes."}
                                        </p>
                                    </article>
                                );
                            })}

                            {reviews.length === 0 ? (
                                <p className="text-sm text-zinc-500 md:col-span-2 xl:col-span-3">
                                    No staff reviews yet.
                                </p>
                            ) : null}
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}

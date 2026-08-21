import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    Download,
    ExternalLink,
    FileText,
    GraduationCap,
    School,
    Trophy,
    UserRound,
} from "lucide-react";
import { requireRole } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

type PageProps = {
    params: Promise<{
        eventId: string;
        entryId: string;
    }>;
};

function firstRelation<T>(
    value: T | T[] | null | undefined,
): T | null {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }

    return value ?? null;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Denver",
    }).format(new Date(value));
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

export default async function CompetitionEntryPage({
    params,
}: PageProps) {
    const { eventId, entryId } = await params;

    const { profile } = await requireRole(["teacher"]);
    const admin = createAdminClient();

    const { data: teacher, error: teacherError } = await admin
        .from("teachers")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle();
    
    if (teacherError || !teacher) {
        notFound();
    }

    const { data: entry, error: entryError } = await admin
        .from("event_competition_entries")
        .select(`
                id,
                category,
                title,
                external_url,
                created_at,
                event_registration_files (
                    id,
                    bucket_name,
                    file_path,
                    original_file_name,
                    mime_type,
                    file_size
                ),
                event_registrations!inner (
                    id,
                    event_id,
                    teacher_id,
                    first_name,
                    last_name,
                    student_email,
                    grade_level,
                    submitted_at,
                    schools (
                        name,
                        state
                    ),
                    lia_classes (
                        name,
                        period
                    ),
                    lia_events (
                        name
                    )
                ) 
            `,
        )
        .eq("id", entryId)
        .maybeSingle();
    
    if (entryError) {
        throw new Error(
            `Unable to load competition entry: ${entryError.message}`,
        );
    }

    const registration = firstRelation(
        entry?.event_registrations,
    );

    if (
        !entry ||
        !registration ||
        registration.event_id !== eventId ||
        registration.teacher_id !== teacher.id
    ) {
        notFound();
    }

    const school = firstRelation(registration.schools);
    const liaClass = firstRelation(registration.lia_classes);
    const event = firstRelation(registration.lia_events);

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
            },
        ),
    );

    const studentName = [
        registration.first_name,
        registration.last_name,
    ]
        .filter(Boolean)
        .join(" ");
    
    return (
        <main className="min-h-screen bg-[#fbf7f7] px-5 py-8 md:px-10">
            <div className="mx-auto max-w-6xl">
                <Link
                    href={`/teacher/events/${eventId}`}
                    className="inline-flex items-center gap-2 font-semibold text-[#c8102e] hover:text-[#9f0d25]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to event
                </Link>

                <section className="mt-6 overflow-hidden roundd-3xl bg-gradient-to-br from-[#b50926] to-[#e32246] p-8 text-white shadow-lg md:p-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/75">
                                Competition submission
                            </p>

                            <h1 className="mt-3 text-4xl font-bold md:text-5xl">
                                {entry.title || "Untitled entry"}
                            </h1>

                            <p className="mt-4 text-lg text-white/85">
                                {entry.category}
                                {" · "}
                                {event?.name || "LIA Event"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                                Submitted by
                            </p>

                            <p className="mt-1 text-xl font-bold">
                                {studentName}
                            </p>
                        </div>
                    </div>
                </section>

                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="rounded-xl bg-red-50 p-3 text-[#c8102e]">
                                <Trophy className="h-5 w-5" />
                            </span>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-[#c8102e]">
                                    Competition entry
                                </p>

                                <h2 className="text-2xl font-bold text-zinc-950">
                                    Submitted work
                                </h2>
                            </div>
                        </div>

                        {entry.external_url ? (
                            <a
                                href={entry.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-6 flex items-center justify-between gap-4 border border-red-200 bg-red-50 px-5 py-4 font-semibold text-[#c8102e] transition hover:border-[#c8102e] hover:bg-red-100"
                            >
                                <span>Open submitted link</span>
                                <ExternalLink className="h-5 w-5"/>
                            </a>
                        ) : null}

                        {files.length > 0 ? (
                            <div className="mt-6 space-y-3">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="rounded-2xl bg-zinc-100 p-3 text-zinc-600">
                                                <FileText className="h-5 w-5" />
                                            </span>

                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-zinc-950">
                                                    {file.original_file_name}
                                                </p>

                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {file.mime_type || "File"}

                                                    {file.file_size
                                                        ? ` · ${formatFileSize(file.file_size)}`
                                                        : ""}
                                                </p>
                                            </div>
                                        </div>

                                        {file.signedUrl ? (
                                            <a
                                                href={file.signedUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inlinex-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-700 hover:bg-zinc-50"
                                            >
                                                <Download className="h-4 w-4" />
                                                Open file
                                            </a>
                                        ) : (
                                            <span className="text-sm text-red-700">
                                                File unavailable
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {!entry.external_url && files.length === 0 ? (
                            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
                                No file or external link is attached to this entry.
                            </div>
                        ) : null}
                    </section>

                    <aside>
                        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-zinc-950">
                                Student details
                            </h2>

                            <dl className="mt-5 space-y-5">
                                <div className="flex gap-3">
                                    <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#c8102e]" />

                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                            Student
                                        </dt>

                                        <dd className="mt-1 font-semibold text-zinc-950">
                                            {studentName}
                                        </dd>

                                        <dd className="text-sm text-zinc-500">
                                            {registration.student_email}
                                        </dd>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-[#c8102e]" />

                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                            Grade and class
                                        </dt>

                                        <dd className="mt-1 font-semibold text-zinc-950">
                                            Grade{" "}
                                            {registration.grade_level ||
                                                "N/A"}
                                        </dd>

                                        <dd className="text-sm text-zinc-500">
                                            {liaClass?.name ||
                                                "Class unavailable"}
                                            
                                            {liaClass?.period
                                                ? ` · Period ${liaClass.period}`
                                                : ""}
                                        </dd>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <School className="mt-.05 h-5 w-5 shrink-0 text-[#c8102e]" />

                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                            School
                                        </dt>

                                        <dd className="mt-1 font-semibold text-zinc-950">
                                            {school?.name || "N/A"}
                                        </dd>

                                        {school?.state ? (
                                            <dd className="text-sm text-zinc-500">
                                                {school.state}
                                            </dd>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#c8102e]" />

                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                            Submitted
                                        </dt>

                                        <dd className="mt-1 font-semibold text-zinc-950">
                                            {formatDate(
                                                entry.created_at ||
                                                    registration.submitted_at,
                                            )}
                                        </dd>
                                    </div>
                                </div>
                            </dl>
                        </section>
                    </aside>
                </div>
            </div>
        </main>
    );
}
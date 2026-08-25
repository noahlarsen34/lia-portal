import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    RotateCcw,
    ScanLine,
    Search,
    TicketCheck,
    TriangleAlert,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    checkInRegistration,
    findTicket,
    undoCheckIn,
} from "./actions";

type CheckInPageProps = {
    params: Promise<{
        eventId: string;
    }>;

    searchParams: Promise<{
        registration?: string;
        success?: string;
        error?: string;
        ticket?: string;
    }>;
};

function relation<T>(value: T | T[] | null) {
    return Array.isArray(value) ? value[0] ?? null : value;
}

function teacherName(
    teacher:
        | {
            first_name: string | null;
            last_name: string | null;
            name: string | null;
        }
        | null,
) {
    if (!teacher) {
        return "Teacher unavailable";
    }

    return (
        [teacher.first_name, teacher.last_name]
            .filter(Boolean)
            .join(" ") ||
        teacher.name ||
        "Teacher unavailble"
    );
}

function formatDateTime(value: string | null) {
    if (!value) {
        return "Not checked in";
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Denver",
    }).format(new Date(value));
}

function errorMessage(error: string | undefined) {
    switch(error) {
        case "missing-ticket":
            return "Scan or enter a ticket first.";
        case "invalid-ticket":
            return "That ticket does not belong to this event.";
        case "withdrawn":
            return "This registration was withdrawn and cannot be used;.";
        case "already-used":
            return "This ticket has already been checked";
        case "invalid-status":
            return "This ticket is not currently valid for check-in.";
        case "not-checked-in":
            return "This registration is not currently checked in.";
        case "undo-failed":
            return "The check-in could not be undone.";
        default:
            return error ? "The ticket could not be processed." : null;
    }
}

export default async function CheckInPage({
    params,
    searchParams,
}: CheckInPageProps) {
    const { eventId } = await params;
    const query = await searchParams;

    await requireStaff();
    const admin = createAdminClient();

    const { data: event, error: eventError } = await admin
        .from("lia_events")
        .select("id, name, event_date, location_name")
        .eq("id", eventId)
        .maybeSingle();
    
    if (eventError) {
        throw new Error(
            `Unable to load event: ${eventError.message}`,
        );
    }

    if (!event) {
        notFound();
    }

    const { data: registration, error: registrationError } = 
        query.registration
            ? await admin
                .from("event_registrations")
                .select(`
                    id,
                    first_name,
                    last_name,
                    student_email,
                    grade_level,
                    status,
                    ticket_number,
                    checked_in_at,
                    schools (
                        name
                    ),
                    teachers (
                        first_name,
                        last_name,
                        name
                    )
                `)
                .eq("id", query.registration)
                .eq("event_id", eventId)
                .maybeSingle()
            : { data: null, error: null};

    if (registrationError) {
        throw new Error(
            `Unable to load registration: ${registrationError.message}`,
        );
    }

    const school = registration
        ? relation(registration.schools)
        : null;
    
    const teacher = registration
        ? relation(registration.teachers)
        : null;
    
    const message = errorMessage(query.error);
    const checkedIn = registration?.status === "checked_in";

    const checkIn = registration
        ? checkInRegistration.bind(null, eventId, registration.id)
        : undefined
    
    const undo = registration
        ? undoCheckIn.bind(null, eventId, registration.id)
        : undefined;
    
    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <Link
                        href={`/events/${eventId}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#c8102e] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Event Management
                    </Link>

                    <header className="mt-5">
                        <p className="text-sm font-bold uppercase tracking-wide text-[#c8102e]">
                            Event check-in
                        </p>

                        <h1 className="mt-2 text-3xl font-semibold">
                            {event.name}
                        </h1>

                        <p className="mt-2 text-sm text-zinc-600">
                            Scan the QR code with a connected scanner, paste 
                            the QR URL, or enter the ticket number.
                        </p>
                    </header>

                    <section className="mt-7 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <form
                            action={findTicket.bind(null, eventId)}
                            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                            <div className="relative flex-1">
                                <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                                <input
                                    autoFocus
                                    autoComplete="off"
                                    name="ticket"
                                    defaultValue={query.ticket ?? ""}
                                    placeholder="LIA-XXXXXXXXXX or ticket URL"
                                    aria-label="Ticket number or QR code URL"
                                    className="h-14 w-full rounded-lg border border-zinc-300 pl-12 pr-4 font-mono text-base outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                />
                            </div>

                            <button
                                type="submit"
                                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-[#c8102e] px-6 font-semibold text-white hover:bg-[#a70d25]"
                            >
                                <Search className="h-5 w-5" />
                                Find ticket
                            </button>
                        </form>
                    </section>

                    {message ? (
                        <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                            {message}
                        </div>
                    ) : null}

                    {query.success === "checked-in" ? (
                        <div className="mt-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                            <CheckCircle2 className="h-5 w-5" />
                            Student checked in successfully.
                        </div>
                    ): null}

                    {query.success === "undone" ? (
                        <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                            The check-in was undone.
                        </div>
                    ) : null}

                    {registration ? (
                        <section className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-whtie shadow-sm">
                            <div className={
                                checkedIn
                                    ? "bg-green-600 px-6 py-5 text-white"
                                    : registration.status === "withdrawn"
                                        ? "bg-red-700 px-6 py-5 text-white"
                                        : "bg-[#172033] px-6 py-5 text-white"
                                }
                            >
                                <div className="flex items-center gap-3">
                                    <TicketCheck className="h-6 w-6" />

                                    <div>
                                        <p className="text-sm tonft-semibold uppercase tracking-wide text-white/70">
                                            Ticket
                                        </p>
                                        <p className="font-mono text-xl font-bold">
                                            {registration.ticket_number}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 sm:p-8">
                                <h2 className="text-3xl font-semibold">
                                    {registration.first_name}{" "}
                                    {registration.last_name}
                                </h2>

                                <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            School
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {school?.name?? "Unavailable"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            Teacher
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {teacherName(teacher)}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            Grade
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {registration.grade_level ??
                                                "Unavailable"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            Check-in time
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {formatDateTime(
                                                registration.checked_in_at,
                                            )}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-8">
                                    {checkedIn && undo ? (
                                        <form action={undo}>
                                            <button
                                                type="submit"
                                                className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-5 font-semibold text-red-700 hover:bg-red-50"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                                Undo check-in
                                            </button>
                                        </form>
                                    ) : registration.status !==
                                        "withdrawn" && checkIn ? (
                                            <form action={checkIn}>
                                                <button
                                                    type="submit"
                                                    className="inline-flex h-12 items-center gap-2 rounded-lg bg-green-600 px-6 font-semibold text-white hover:bg-green-700"
                                                >
                                                    <CheckCircle2 className="h-5 w-5" />
                                                    Check in student
                                                </button>
                                            </form>
                                        ) : null}
                                </div>
                            </div>
                        </section>
                    ) : null}
                </div>
            </section>
        </main>
    );
}

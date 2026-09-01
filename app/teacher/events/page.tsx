import {
    CalendarDays,
    Clock,
    ExternalLink,
    MapPin,
    Users,
    ArrowRight,
} from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { EVENT_TIMEZONES } from "@/utils/timezones";
import Link from "next/link";

function getMountainDate() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const year = parts.find(
        (part) => part.type === "year",
    )?.value;

    const month = parts.find(
        (part) => part.type === "month",
    )?.value;

    const day = parts.find(
        (part) => part.type === "day",
    )?.value;

    return `${year}-${month}-${day}`;
}

function formatEventDate(value: string) {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
}

function formatTime(value: string | null) {
    if (!value) {
        return null;
    }

    const [hoursValue, minutesValue] = value.split(":");
    const hours = Number(hoursValue);
    const minutes = Number(minutesValue);

    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    }).format(
        new Date(
            Date.UTC(2026, 0, 1, hours, minutes),
        ),
    );
}

function getDirectionsUrl(
    locationName: string,
    address: string | null,
) {
    const destination =
        address || locationName;
    
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        destination,
    )}`;
}

function getRegistrationStatus(
    eventDate: string,
    registrationDeadline: string | null,
) {
    const today = getMountainDate();

    if (eventDate < today) {
        return {
            label: "Completed",
            className:
                "bg-zinc-100 text-zinc-600",
        };
    }

    if (
        registrationDeadline &&
        registrationDeadline < today
    ) {
        return {
            label: "Registration Closed",
            className:
                "bg-amber-50 text-amber-700",
        };
    }

    return {
        label: "Registration Open",
        className:
            "bg-green-50 text-green-700",
    };
}

export default async function TeacherEventsPage() {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();

    const { data: teacher, error: teacherError } =
        profile.role === "teacher"
            ? await admin
                .from("teachers")
                .select("id, school_id")
                .eq("profile_id", profile.id)
                .maybeSingle()
            : { data: null, error: null };
    
    if (teacherError) {
        throw new Error(
            `Unable to load teacher school: ${teacherError.message}`,
        );
    }

    let eligibleEventIds: string[] = [];

    if (teacher?.school_id) {
        const {
            data: eventSchoolRows,
            error: eventSchoolsError,
        } = await admin
            .from("lia_event_schools")
            .select("event_id")
            .eq("school_id", teacher.school_id);
        
        if (eventSchoolsError) {
            throw new Error(
                `Unable to load eligible events: ${eventSchoolsError.message}`,
            );
        }

        eligibleEventIds = (eventSchoolRows ?? []).map(
            (row) => row.event_id,
        );
    }

    let eventsQuery = admin
        .from("lia_events")
        .select(
            `
                id,
                name,
                description,
                event_date,
                start_time,
                end_time,
                timezone,
                location_name,
                address,
                registration_deadline,
                capacity,
                all_schools,
                status 
            `,
        )
        .eq("status", "open")
        .gte("event_date", getMountainDate())
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });
    
    if (profile.role === "teacher") {
        if (!teacher?.school_id) {
            eventsQuery = eventsQuery.eq(
                "all_schools",
                true,
            );
        } else if (eligibleEventIds.length > 0) {
            eventsQuery = eventsQuery.or(
                `all_schools.eq.true,id.in.(${eligibleEventIds.join(
                    ",",
                )})`,
            );
        } else {
            eventsQuery = eventsQuery.eq(
                "all_schools",
                true,
            )
        }
    }

    const { data: events, error: eventsError } =
        await eventsQuery;
    
    if (eventsError) {
        throw new Error(
            `Unable to load teacher events: ${eventsError.message}`,
        );
    }

    return (
        <div className="mx-auto max-w-6xl">
            <header className="rounded-md border border-red-100 bg-white px-6 py-7 shadow-sm sm:px-8">
                <p className="text-sm font-semibold uppercase text-[#c8102e]">
                    LIA Community
                </p>

                <h1 className="mt-2 text-3xl font-bold text-zinc-950 sm:text-4xl">
                    Upcoming Events
                </h1>

                <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
                    View events available to your school. Student
                    registration options will appear here when registration
                    becomes available.
                </p>
            </header>

            <section className="mt-6 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5 sm:px-8">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-950">
                            Event Schedule
                        </h2>

                        <p className="mt-1 text-sm text-zinc-600">
                            Events open to all schools or specifically 
                            available to your school.
                        </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#c8102e]">
                        {(events ?? []).length} upcoming
                    </span>
                </div>

                <div className="space-y-4 bg-zinc-50/60 p-4 sm:p-6">
                    {(events ?? []).map((event) => {
                        const startTime = formatTime(
                            event.start_time,
                        );

                        const endTime = formatTime(
                            event.end_time,
                        );

                        const eventTimezone =
                            event.timezone ?? "America/Denver";
                        const eventTimezoneLabel =
                            EVENT_TIMEZONES.find(
                                (timezone) =>
                                    timezone.value === eventTimezone,
                            )?.label ?? eventTimezone;

                        const registrationStatus =
                            getRegistrationStatus(
                                event.event_date,
                                event.registration_deadline,
                            );
                        
                        return (
                            <article
                                key={event.id}
                                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                            >
                                <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
                                    <div className="min-w-0 p-5 sm:p-6">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${registrationStatus.className}`}
                                            >
                                                {registrationStatus.label}
                                            </span>

                                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#c8102e]">
                                                {event.all_schools
                                                    ? "All LIA Schools"
                                                    : "Available to Your School"}
                                            </span>
                                        </div>

                                        <h3 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950">
                                            <Link
                                                href={`/teacher/events/${event.id}`}
                                                prefetch={false}
                                                className="transition-colors hover:text-[#c8102e]"
                                            >
                                                {event.name}
                                            </Link>
                                        </h3>

                                        {event.description ? (
                                            <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                                                {event.description}
                                            </p>
                                        ) : null}

                                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                            <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-[#c8102e]">
                                                    <CalendarDays className="h-4 w-4" />
                                                </span>

                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                        Date
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-zinc-900">
                                                    {formatEventDate(
                                                        event.event_date,
                                                    )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-[#c8102e]">
                                                    <Clock className="h-4 w-4" />
                                                </span>

                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                        Time
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-zinc-900">
                                                        {startTime || "Time TBD"}
                                                        {endTime
                                                            ? ` – ${endTime}`
                                                            : ""}
                                                    </p>

                                                    <p className="mt-1 text-xs text-zinc-500">
                                                        {eventTimezoneLabel}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3 sm:col-span-2">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-[#c8102e]">
                                                    <MapPin className="h-4 w-4" />
                                                </span>

                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                        Location
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-zinc-900">
                                                        {event.location_name}
                                                    </p>

                                                    {event.address ? (
                                                        <p className="mt-0.5 text-sm text-zinc-500">
                                                            {event.address}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-zinc-100 pt-5">
                                            <a
                                                href={getDirectionsUrl(
                                                    event.location_name,
                                                    event.address,
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Get Directions
                                            </a>

                                            {event.registration_deadline ? (
                                                <p className="text-sm text-zinc-500">
                                                    Registration deadline:{" "}
                                                    <span className="font-medium text-zinc-700">
                                                        {formatEventDate(
                                                            event.registration_deadline,
                                                        )}
                                                    </span>
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <aside className="border-t border-zinc-200 bg-zinc-50/80 p-5 sm:p-6 lg:border-l lg:border-t-0">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#c8102e] shadow-sm ring-1 ring-zinc-200">
                                            <Users className="h-5 w-5" />
                                        </div>

                                        <p className="mt-4 font-semibold text-zinc-950">
                                            Student Registration
                                        </p>

                                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                                            Registration options will be
                                            added after the student workflow is finalized.
                                        </p>

                                        <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                Capacity
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-zinc-900">
                                                {event.capacity
                                                    ? `${event.capacity.toLocaleString("en-US")} students`
                                                    : "No capacity limit"}
                                            </p>
                                        </div>

                                        <Link
                                            href={`/teacher/events/${event.id}`}
                                            prefetch={false}
                                            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white transition hover:bg-[#a70d25]"
                                        >
                                            View Event
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </aside>
                                </div>
                            </article>
                        )
                    })}

                    {(events ?? []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center sm:px-8">
                            <CalendarDays className="mx-auto h-10 w-10 text-zinc-300" />

                            <h3 className="mt-3 font-semibold text-zinc-900">
                                No upcoming events
                            </h3>

                            <p className="mt-1 text-sm text-zinc-500">
                                There are currently no open events available
                                to your school.
                            </p>
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}

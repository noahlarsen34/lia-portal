import {
    Calendar,
    CalendarDays,
    Clock,
    MapPin,
    Users,
} from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

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

                <div className="divide-y divide-zinc-200">
                    {(events ?? []).map((event) => {
                        const startTime = formatTime(
                            event.start_time,
                        );

                        const endTime = formatTime(
                            event.end_time,
                        );

                        const registrationStatus =
                            getRegistrationStatus(
                                event.event_date,
                                event.registration_deadline,
                            );
                        
                        return (
                            <article
                                key={event.id}
                                className="px-6 py-6 transition-colors hover:bg-zinc-50/70 sm:px-8"
                            >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1">
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

                                        <h3 className="mt-3 text-2xl font-bold text-zinc-950">
                                            {event.name}
                                        </h3>

                                        {event.description ? (
                                            <p className="mt-2 max-w-3xl whitespace-pre-wrap leading-7 text-zinc-600">
                                                {event.description}
                                            </p>
                                        ) : null}

                                        <div className="mt-5 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                                            <div className="flex items-start gap-2">
                                                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#c8102e]" />

                                                <span>
                                                    {formatEventDate(
                                                        event.event_date,
                                                    )}
                                                </span>
                                            </div>

                                            <div className="flex items-start gap-2">
                                                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#c8102e]" />

                                                <span>
                                                    {startTime || "Time TBD"}
                                                    {endTime
                                                        ? `- ${endTime}`
                                                        : ""}
                                                </span>
                                            </div>

                                            <div className="flex items-start gap-2">
                                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#c8102e]" />
                                                
                                                <span>
                                                    <span className="block font-medium text-zinc-900">
                                                        {event.location_name}
                                                    </span>

                                                    {event.address ? (
                                                        <span className="mt-1 block text-zinc-500">
                                                            {event.address}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </div>

                                            <div className="flex items-start gap-2">
                                                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#c8102e]" />

                                                <span>
                                                    {event.capacity
                                                        ? `Capacity: ${event.capacity.toLocaleString(
                                                            "en-US",
                                                        )}`
                                                        : "No capacity limit"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-wrap items-center gap-3">
                                            <a
                                                href={getDirectionsUrl(
                                                    event.location_name,
                                                    event.address,
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                                            >
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

                                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 lg:w-64">
                                        <p className="font-semibold text-zinc-900">
                                            Student Registration
                                        </p>

                                        <p className="mt-1 leading-6">
                                            Registration options will be
                                            added after the student workflow is finalized.
                                        </p>
                                    </div>
                                </div>
                            </article>
                        )
                    })}

                    {(events ?? []).length === 0 ? (
                        <div className="px-6 py-12 text-center sm:px-8">
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

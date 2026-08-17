import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    Clock,
    ExternalLink,
    MapPin,
    ShieldCheck,
    TicketCheck,
    Users,
} from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { EventCountdown } from "./event-countdown";

type TeacherEventPageProps = {
    params: Promise<{
        eventId: string;
    }>;
};

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
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address || locationName,
    )}`;
}

function getMountainEventStart(
    eventDate: string,
    startTime: string | null,
) {
    const eventReference = new Date(
        `${eventDate}T12:00:00Z`,
    );

    const zoneName = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        timeZoneName: "longOffset",
    })
        .formatToParts(eventReference)
        .find((part) => part.type === "timeZoneName")
        ?.value;

    const offset = zoneName?.match(
        /GMT([+-]\d{2}:\d{2})/,
    )?.[1] ?? "-07:00";

    const localTime = startTime
        ? startTime.slice(0, 5)
        : "00:00";

    return `${eventDate}T${localTime}:00${offset}`;
}

function getRegistrationStatus(
    eventDate: string,
    registrationDeadline: string | null,
) {
    const today = getMountainDate();

    if (eventDate < today) {
        return {
            label : "Event Completed",
            className:
                "border-zinc-200 bg-zinc-100 text-zinc-600",
        };
    }

    if (
        registrationDeadline &&
        registrationDeadline < today
    ) {
        return {
            label: "Registration Closed",
            className:
                "border-amber-200 bg-amber-50 text-amber-700",
        };
    }

    return {
        label: "Registration Open",
        className:
            "border-green-200 bg-green-50 text-green-700",
    };
}

export default async function TeacherEventPage({
    params,
}: TeacherEventPageProps) {
    const { eventId } = await params;
    const { profile } = await requireTeacher();
    const admin = createAdminClient();

    const { data: event, error : eventError } =
        await admin
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
            .eq("id", eventId)
            .eq("status", "open")
            .maybeSingle();
    
    if (eventError) {
        throw new Error(
            `Unable to load event: ${eventError.message}`,
        );
    }

    if (!event) {
        notFound();
    }

    if (
        profile.role === "teacher" &&
        !event.all_schools
    ) {
        const { data: teacher, error: teacherError} =
            await admin
                .from("teachers")
                .select("school_id")
                .eq("profile_id", profile.id)
                .maybeSingle();
        
        if (teacherError) {
            throw new Error(
                `Unable to verify teacher school: ${teacherError.message}`,
            );
        }

        if (!teacher?.school_id) {
            notFound();
        }

        const {
            data: eligibleSchool,
            error: eligibilityError,
        } = await admin
            .from("lia_event_schools")
            .select("event_id")
            .eq("event_id", event.id)
            .eq("school_id", teacher.school_id)
            .maybeSingle();
        
        if (eligibilityError) {
            throw new Error(
                `Unable to verify event eligibility: ${eligibilityError.message}`,
            );
        }

        if (!eligibleSchool) {
            notFound();
        }
    }

    const startTime = formatTime(event.start_time);
    const endTime = formatTime(event.end_time);

    const eventStart = getMountainEventStart(
        event.event_date,
        event.start_time,
    );

    const registrationStatus = 
        getRegistrationStatus(
            event.event_date,
            event.registration_deadline,
        );

    return (
        <div className="mx-auto max-w-6xl pb-12">
            <Link
                href="/teacher/events"
                className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to events
            </Link>

            <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9f0c25] via-[#c8102e] to-[#e23550] px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
                <div className="absolute -bottom-28 right-28 h-64 w-64 rounded-full bg-black/10" />

                <div className="relative max-w-4xl">
                    <div className="flex flex-wrap gap-2">
                        <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${registrationStatus.className}`}
                        >
                            {registrationStatus.label}
                        </span>

                        <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                            {event.all_schools
                                ? "All LIA Schools"
                                : "Selected Schools"}
                        </span>
                    </div>

                    <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-white/75">
                        Latinos In Action Event
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                        {event.name}
                    </h1>

                    {event.description ? (
                        <p className="mt-5 max-w-3xl text-base leading-7 text-white/85 sm:text-lg">
                            {event.description}
                        </p>
                    ) : null}

                    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/90">
                        <span className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5" />
                            {formatEventDate(
                                event.event_date,
                            )}
                        </span>

                        <span className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            {event.location_name}
                        </span>
                    </div>
                </div>
            </header>

            <section className="relative z-10 mx-4 -mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#172033] via-[#202a3d] to-[#2b3952] p-5 text-white shadow-xl ring-1 ring-white/10 sm:mx-8 sm:p-7">
                <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                            Don&apos;t miss this opportunity
                        </p>

                        <h2 className="mt-2 text-2xl font-bold">
                            The event begins in
                        </h2>

                        <div className="mt-5">
                            <EventCountdown targetTime={eventStart} />
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                        <p className="font-semibold">
                            Student registration
                        </p>

                        <p className="mt-2 text-sm leading-6 text-white/60">
                            Registration tools and attendance totals will appear here
                            when the student workflow is ready.
                        </p>

                        <button
                            type="button"
                            disabled
                            className="mt-5 inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-md bg-white/10 px-4 text-sm font-semibold text-white/45"
                        >
                            Registration Coming Soon
                        </button>
                    </div>
                </div>
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                            About the event
                        </p>

                        <h2 className="mt-2 text-2xl font-bold text-zinc-950">
                            Event Description
                        </h2>

                        {event.description ? (
                            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-zinc-600">
                                {event.description}
                            </p>
                        ) : (
                            <p className="mt-4 text-base leading-8 text-zinc-500">
                                Additional information about this event will be added soon.
                            </p>
                        )}
                    </section>

                    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                            Schedule
                        </p>

                        <h2 className="mt-2 text-2xl font-bold text-zinc-950">
                            Date and Time
                        </h2>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <div className="flex gap-4 rounded-lg bg-zinc-50 p-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                                    <CalendarDays className="h-5 w-5" />
                                </span>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Date
                                    </p>

                                    <p className="mt-1 font-semibold text-zinc-950">
                                        {formatEventDate(
                                            event.event_date,
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 rounded-lg bg-zinc-50 p-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                                    <Clock className="h-5 w-5" />
                                </span>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Time
                                    </p>

                                    <p className="mt-1 font-semibold text-zinc-950">
                                        {startTime || "Time TBD"}
                                        {endTime
                                            ? ` - ${endTime}`
                                            : ""}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                            <ShieldCheck className="h-5 w-5" />
                        </div>

                        <h2 className="mt-4 text-2xl font-bold text-zinc-950">
                            Event Requirements
                        </h2>

                        <p className="mt-3 leading-7 text-zinc-600">
                            Event requirements, preparation
                            instructions, and required forms will
                            be available here when provided by LIA staff.
                        </p>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                            <MapPin className="h-5 w-5" />
                        </div>

                        <h2 className="mt-4 text-xl font-bold text-zinc-950">
                            Location
                        </h2>

                        <p className="mt-3 font-semibold text-zinc-950">
                            {event.location_name}
                        </p>

                        {event.address ? (
                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                                {event.address}
                            </p>
                        ) : null}

                        <a
                            href={getDirectionsUrl(
                                event.location_name,
                                event.address,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-whtie px-4 text-sm font-semibold text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Get Directions
                        </a>
                    </section>

                    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                            <Users className="h-5 w-5" />
                        </div>

                        <h2 className="mt-4 text-xl font-bold text-zinc-950">
                            Event Capacity
                        </h2>

                        <p className="mt-3 text-3xl font-bold text-zinc-950">
                            {event.capacity
                                ? event.capacity.toLocaleString(
                                    "en-US",
                                )
                                : "Unlimited"}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500">
                            {event.capacity
                                ? "Maximum student participants"
                                : "No capacity limits has been set"}
                        </p>
                    </section>

                    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                            <TicketCheck className="h-5 w-5" />
                        </div>

                        <h2 className="mt-4 text-xl font-bold text-zinc-950">
                            Registration
                        </h2>

                        {event.registration_deadline ? (
                            <>
                                <p className="mt-3 text-sm text-zinc-500">
                                    Registration deadline
                                </p>

                                <p className="mt-1 font-semibold text-zinc-950">
                                    {formatEventDate(
                                        event.registration_deadline,
                                    )}
                                </p>
                            </>
                        ) : (
                            <p className="mt-3 text-sm leading-6 text-zinc-500">
                                No registration deadline has been set.
                            </p>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
}

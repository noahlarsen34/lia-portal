import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    ClipboardList,
    Clock,
    Download,
    ExternalLink,
    Info,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    TicketCheck,
    UserRound,
    Users,
} from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { EventCountdown } from "./event-countdown";
import { EventRegistrationShare } from "./event-registration-share";
import { RemoveRegistrationButton } from "./remove-registration-button";

type TeacherEventPageProps = {
    params: Promise<{
        eventId: string;
    }>;
    searchParams: Promise<{
        preview?: string;
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
    searchParams,
}: TeacherEventPageProps) {
    const { eventId } = await params;
    const { preview } = await searchParams;
    const { profile } = await requireTeacher();
    const admin = createAdminClient();

    const isAdminPreview =
        profile.role === "admin" && preview === "1";

    let eventQuery = admin
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
                    status,
                    banner_image_url,
                    requirements,
                    agenda,
                    additional_instructions,
                    contact_name,
                    contact_email,
                    contact_phone,
                    resource_label,
                    resource_url,
                    registration_token
                `,
        )
        .eq("id", eventId);

    if (!isAdminPreview) {
        eventQuery = eventQuery.eq("status", "open");
    }

    const { data: event, error: eventError } =
        await eventQuery.maybeSingle();
    
    if (eventError) {
        throw new Error(
            `Unable to load event: ${eventError.message}`,
        );
    }

    if (!event) {
        notFound();
    }

    const { data: currentTeacher, error: currentTeacherError } =
        profile.role === "teacher"
            ? await admin
                .from("teachers")
                .select("id, school_id")
                .eq("profile_id", profile.id)
                .maybeSingle()
            : {
                data: null,
                error: null,
            };
    
    if (currentTeacherError) {
        throw new Error(
            `Unable to load teacher record: ${currentTeacherError.message}`,
        );
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

    let registrations: Array<{
        id: string;
        first_name: string;
        last_name: string;
        student_email: string;
        grade_level: string | null;
        competition_category: string | null;
        entry_title: string | null;
        competition_entries: Array<{
            id: string;
            category: string;
            title: string | null;
        }>;
        status: string;
        ticket_number: string;
        ticket_token: string;
        submitted_at: string;
        schools: 
            | {
                name: string;
            }
            | Array<{
                name: string;
            }>
            | null;
        lia_classes:
            | {
                name: string;
                period: string | null;
            }
            | Array<{
                name: string;
                period: string | null;
            }>
            | null;
    }> = [];

    if (profile.role === "teacher" && currentTeacher?.id) {
        const {
            data: teacherRegistrations,
            error: registrationsError,
        } = await admin
            .from("event_registrations")
            .select(
                `
                    id,
                    first_name,
                    last_name,
                    student_email,
                    grade_level,
                    competition_category,
                    entry_title,
                    competition_entries:event_competition_entries(
                        id,
                        category,
                        title
                    ),
                    status,
                    ticket_number,
                    ticket_token,
                    submitted_at,
                    schools (
                        name
                    ),
                    lia_classes (
                        name,
                        period
                    )  
                `,
            )
            .eq("event_id", event.id)
            .eq("teacher_id", currentTeacher.id)
            .neq("status", "withdrawn")
            .order("last_name")
            .order("first_name");
        
        if (registrationsError) {
            throw new Error(
                `Unable to load event registrations: ${registrationsError.message}`,
            );
        }

        registrations =
            (teacherRegistrations ?? []) as typeof registrations;
    } else if (isAdminPreview) {
        const {
            data: eventRegistrations,
            error: registrationsError,
        } = await admin
            .from("event_registrations")
            .select(
                `
                    id,
                    first_name,
                    last_name,
                    student_email,
                    grade_level,
                    competition_category,
                    entry_title,
                    competition_entries:event_competition_entries(
                        id,
                        category,
                        title
                    ),
                    status,
                    ticket_number,
                    ticket_token,
                    submitted_at,
                    schools (
                        name
                    ),
                    lia_classes (
                        name,
                        period
                    ) 
                `,
            )
            .eq("event_id", event.id)
            .neq("status", "withdrawn")
            .order("last_name")
            .order('first_name');
        
        if (registrationsError) {
            throw new Error(
                `Unabel to load event registrations: ${registrationsError.message}`,
            );
        }

        registrations =
            (eventRegistrations ?? []) as typeof registrations;
    }

    const registrationPath =
        `/event-registration/${event.registration_token}`;

    const registrationIsOpen =
        event.status === "open" &&
        event.event_date >= getMountainDate() &&
        (!event.registration_deadline ||
            event.registration_deadline >=
                getMountainDate());
    
    
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
            {isAdminPreview ? (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p>
                        <span className="font-semibold">Admin preview:</span>{" "}
                        teachers can only see this event when it is open and available to their school.
                    </p>

                    <Link
                        href={`/events/${eventId}/edit`}
                        className="font-semibold text-amber-900 underline underline-offset-2"
                    >
                        Return to editor
                    </Link>
                </div>
            ) : null}

            <Link
                href="/teacher/events"
                className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to events
            </Link>

            <header
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9f0c25] via-[#c8102e] to-[#e23550] px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14 lg:min-h-[29rem]"
            >
                {event.banner_image_url ? (
                    <>
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-cover bg-center lg:left-[43%]"
                            style={{
                                backgroundImage: `url(${JSON.stringify(
                                    event.banner_image_url,
                                )})`,
                            }}
                        />

                        <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(111,6,26,0.96)_0%,rgba(159,12,37,0.90)_42%,rgba(159,12,37,0.48)_68%,rgba(111,6,26,0.12)_100%)] lg:bg-[linear-gradient(90deg,#9f0c25_0%,rgba(159,12,37,0.98)_40%,rgba(159,12,37,0.62)_51%,rgba(159,12,37,0.08)_72%,transparent_100%)]"
                        />
                    </>
                ) : (
                    <>
                        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
                        <div className="absolute -bottom-28 right-28 h-64 w-64 rounded-full bg-black/10" />
                    </>
                )}

                <div className="relative max-w-4xl lg:max-w-[48%]">
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
                            <EventRegistrationShare
                                eventName={event.name}
                                registrationPath={registrationPath}
                                registrationOpen={registrationIsOpen}
                                registrationCount={registrations.length}
                            />
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
                            <p className="mt-4 whitespace-pre-wrap pl-px text-base leading-8 text-zinc-600">
                                {event.description}
                            </p>
                        ) : (
                            <p className="mt-4 pl-px text-base leading-8 text-zinc-500">
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

                        {event.agenda ? (
                            <div className="mt-6 border-t border-zinc-200 pt-6">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                                        <ClipboardList className="h-5 w-5" />
                                    </span>

                                    <h3 className="text-lg font-bold text-zinc-950">
                                        Event Agenda
                                    </h3>
                                </div>

                                <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-zinc-600">
                                    {event.agenda}
                                </p>
                            </div>
                        ) : null}
                    </section>

                    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                            <ShieldCheck className="h-5 w-5" />
                        </div>

                        <h2 className="mt-4 text-2xl font-bold text-zinc-950">
                            Event Requirements
                        </h2>

                        {event.requirements ? (
                            <p className="mt-3 whitespace-pre-wrap leading-8 text-zinc-600">
                                {event.requirements}
                            </p>
                        ) : (
                            <p className="mt-3 leading-7 text-zinc-500">
                                No additional event requirements have been provided.
                            </p>
                        )}
                    </section>

                    {event.additional_instructions ? (
                        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                                <Info className="h-5 w-5" />
                            </div>

                            <h2 className="mt-4 text-2xl font-bold text-zinc-950">
                                Additional Instructions
                            </h2>

                            <p className="mt-3 whitespace-pre-wrap leading-8 text-zinc-600">
                                {event.additional_instructions}
                            </p>
                        </section>
                    ) : null}
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
                            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
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

                    {event.contact_name ||
                    event.contact_email ||
                    event.contact_phone ? (
                        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-[#c8102e]">
                                <UserRound className="h-5 w-5" />
                            </div>

                            <h2 className="mt-4 text-xl font-bold text-zinc-950">
                                Event Contact
                            </h2>

                            {event.contact_name ? (
                                <p className="mt-3 font-semibold text-zinc-950">
                                    {event.contact_name}
                                </p>
                            ) : null}

                            {event.contact_email ? (
                                <a
                                    href={`mailto:${event.contact_email}`}
                                    className="mt-3 flex items-start gap-2 break-all text-sm text-zinc-600 hover:text-[#c8102e]"
                                >
                                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                                    {event.contact_email}
                                </a>
                            ) : null}

                            {event.contact_phone ? (
                                <a
                                    href={`tel:${event.contact_phone}`}
                                    className="mt-3 flex items-center gap-2 text-sm text-zinc-600 hover:text-[#c8102e]"
                                >
                                    <Phone className="h-4 w-4 shrink-0" />
                                    {event.contact_phone}
                                </a>
                            ) : null}
                        </section>
                    ) : null}

                    {event.resource_url ? (
                        <section className="rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[#c8102e] shadow-sm">
                                <Download className="h-5 w-5" />
                            </div>

                            <h2 className="mt-4 text-xl font-bold text-zinc-950">
                                Event Resource
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-zinc-600">
                                Open the materials provided by LIA staff for this event.
                            </p>

                            <a
                                href={event.resource_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                            >
                                <ExternalLink className="h-4 w-4" />
                                {event.resource_label || "Open Event Resource"}
                            </a>
                        </section>
                    ) : null}
                </aside>
            </div>

            <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-5 sm:px-8">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                            Event registration
                        </p>

                        <h2 className="mt-1 text-2xl font-bold text-zinc-950">
                            Registered Students
                        </h2>

                        <p className="mt-1 text-sm text-zinc-500">
                            Students who selected you as their LIA teacher.
                        </p>
                    </div>

                    <div className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-[#c8102e]">
                        {registrations.length.toLocaleString("en-US")}{" "}
                        {registrations.length === 1
                            ? "student"
                            : "students"}
                    </div>
                </div>

                {registrations.length === 0 ? (
                    <div className="px-6 py-14 text-center sm:px-8">
                        <Users className="mx-auto h-10 w-10 text-zinc-300" />

                        <h3 className="mt-4 font-semibold text-zinc-900">
                            No students have registerd yet
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-inc-500">
                            Share the registration link or QR code above 
                            with your students. Their registrations will
                            appear here automatically.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Student
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Grade
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Class
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Competition
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Status
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Ticket
                                    </th>

                                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-zinc-100 bg-white">
                                {registrations.map((registration) => {
                                    const school = Array.isArray(
                                        registration.schools,
                                    )
                                        ? registration.schools[0]
                                        : registration.schools;
                                    
                                    const liaClass = Array.isArray(
                                        registration.lia_classes,
                                    )
                                        ? registration.lia_classes[0]
                                        : registration.lia_classes;
                                    
                                    const competitionEntries =
                                        registration.competition_entries ?? [];

                                    return (
                                        <tr
                                            key={registration.id}
                                            className="hover:bg-zinc-50/70"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-zinc-950">
                                                    {registration.first_name}{" "}
                                                    {registration.last_name}
                                                </p>

                                                <p className="mt-1 text-sm text-zinc-500">
                                                    {registration.student_email}
                                                </p>

                                                {school?.name ? (
                                                    <p className="mt-1 text-xs text-zinc-400">
                                                        {school.name}
                                                    </p>
                                                ) : null}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                                                {registration.grade_level ||
                                                    "N/A"}
                                            </td>

                                            <td className="px-6 py-4 text-sm text-zinc-700">
                                                {liaClass ? (
                                                    <>
                                                        <p>{liaClass.name}</p>

                                                        {liaClass.period ? (
                                                            <p className="mt-1 text-xs text-zinc-500">
                                                                Period{" "}
                                                                {liaClass.period}
                                                            </p>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    "Not selected"
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                {competitionEntries.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {competitionEntries.map((entry) => (
                                                            <Link
                                                                key={entry.id}
                                                                href={`/teacher/events/${event.id}/competitions/${entry.id}`}
                                                                className="block rounded-lg border border-zinc-200 bg-white px-3 py-2 transition hover:border-[#c8102e] hover:bg-red-50"
                                                            >
                                                                <span className="block text-sm font-semibold text-[#c8102e]">
                                                                    {entry.category}
                                                                </span>

                                                                <span className="mt-0.5 block text-xs text-zinc-500">
                                                                    {entry.title || "Untitled entry"}
                                                                </span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ) : registration.competition_category ? (
                                                    <div>
                                                        <p className="text-sm font-semibold text-zinc-900">
                                                            {registration.competition_category}
                                                        </p>

                                                        <p className="mt-1 text-sm text-zinc-500">
                                                            {registration.entry_title || "Untitled entry"}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-zinc-400">
                                                        No entry submitted
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                                        registration.status ===
                                                        "checked_in"
                                                            ? "bg-green-50 text-green-700"
                                                            : registration.status ===
                                                                "ticket_issued"
                                                                ? "bg-blue-50 text-blue-700"
                                                                : "bg-amber-50 text-amber-700"
                                                    }`}
                                                >
                                                    {registration.status ===
                                                    "checked_in"
                                                        ? "Checked In"
                                                        : registration.status ===
                                                            "ticket_issued"
                                                            ? "Ticket Issued"
                                                            : "Registered"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/event-ticket/${registration.ticket_token}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs font-bold text-[#c8102e] transition hover:border-[#c8102e] hover:bg-red-100"
                                                >
                                                    {registration.ticket_number}
                                                </Link>

                                                <span className="mt-2 block text-xs text-zinc-400">
                                                    Open ticket
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                {profile.role === "teacher" ? (
                                                    <RemoveRegistrationButton
                                                        eventId={event.id}
                                                        registrationId={registration.id}
                                                        studentName={`${registration.first_name} ${registration.last_name}`}
                                                    />
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
    CalendarDays,
    Clock,
    MapPin,
    ShieldCheck,
    TicketCheck,
} from "lucide-react";
import { createAdminClient } from "@/utils/supabase/admin";
import { TicketQr } from "./ticket-qr";

type TicketPageProps = {
    params: Promise<{
        ticketToken: string;
    }>;
};

type EventRecord = {
    id: string;
    name: string;
    event_date: string | null;
    start_time: string | null;
    end_time: string | null;
    location_name: string | null;
    address: string | null;
};

function relatedEvent(
    value: EventRecord | EventRecord[] | null,
) {
    return Array.isArray(value) ? value[0] ?? null : value;
}

function formatEventDate(value: string | null) {
    if (!value) {
        return "Date to be announced";
    }

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

    const [hours, minutes] = value.split(":").map(Number);

    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(2026,0,1,hours,minutes)),);
}

export default async function EventTicketPage({
    params,
}: TicketPageProps) {
    const { ticketToken } = await params;
    const supabase = createAdminClient();

    const { data: registration, error } = await supabase
        .from("event_registrations")
        .select(`
                id,
                first_name,
                last_name,
                grade_level,
                competition_category,
                entry_title,
                status,
                ticket_number,
                ticket_token,
                lia_events (
                    id,
                    name,
                    event_date,
                    start_time,
                    end_time,
                    location_name,
                    address
                ) 
            `,)
        .eq("ticket_token", ticketToken)
        .neq("status", "withdrawn")
        .maybeSingle();
    
    if (error) {
        console.error("Event ticket lookup failed", {
            ticketToken,
            message: error.message,
        });
    }

    if (!registration) {
        notFound();
    }

    const event = relatedEvent(
        registration.lia_events as 
            | EventRecord
            | EventRecord[]
            | null,
    );

    if (!event) {
        notFound();
    }

    const startTime = formatTime(event.start_time);
    const endTime = formatTime(event.end_time);
    const ticketPath = `/event-ticket/${registration.ticket_token}`;
    const checkedIn = registration.status === "checked_in";

    return (
        <main className="min-h-screen bg-[#f8f3f4] px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto max-w-6xl">
                <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_24px_70px_rgba(65,25,35,0.16)]">
                    <section className="relative overflow-hidden bg-gradient-to-br from-[#a90925] via-[#c8102e] to-[#eb244a] px-7 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
                        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
                        <div className="absolute -bottom-32 right-40 h-64 w-64 rounded-full bg-[#8f071f]/20" />

                        <div className="relative">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/75 sm:text-sm">
                            Latinos In Action Event Ticket
                        </p>

                        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                            {event.name}
                        </h1>

                        <div className="mt-8 flex flex-col gap-3 text-sm font-medium text-white/90 sm:flex-row sm:flex-wrap sm:gap-x-7 sm:gap-y-4 sm:text-base">
                            <span className="inline-flex items-center gap-2.5">
                                <CalendarDays size={19} />
                                {formatEventDate(event.event_date)}
                            </span>

                            {startTime ? (
                                <span className="inline-flex items-center gap-2.5">
                                    <Clock size={19} />
                                    {startTime}
                                    {endTime ? ` - ${endTime}` : ""}
                                </span>
                            ) : null}

                            {event.location_name ? (
                                <span className="inline-flex items-center gap-2.5">
                                    <MapPin size={19} />
                                    {event.location_name}
                                </span>
                            ) : null}
                        </div>
                        </div>
                    </section>

                    <section className="grid bg-[#172033] lg:grid-cols-[minmax(0,1fr)_400px]">
                        <div className="p-7 text-white sm:p-10 lg:p-14">
                            <div
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                                    checkedIn
                                        ? "bg-green-400/14 text-green-300"
                                        : "bg-white/10 text-white"
                                }`}
                            >
                                {checkedIn ? (
                                    <ShieldCheck size={18} />
                                ) : (
                                    <TicketCheck size={18} />
                                )}

                                {checkedIn
                                    ? "Checked In"
                                    : "Valid Event Ticket"}
                            </div>

                            <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                                Student
                            </p>

                            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                                {registration.first_name}{" "}
                                {registration.last_name}
                            </h2>

                            {registration.grade_level ? (
                                <p className="mt-2 text-white/65">
                                    Grade {registration.grade_level}
                                </p>
                            ) : null}

                            <div className="mt-10 border-t border-white/15 pt-8">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                                    Competition Entry
                                </p>

                                <p className="mt-3 text-xl font-semibold sm:text-2xl">
                                    {registration.entry_title}
                                </p>

                                <p className="mt-1 text-white/65">
                                    {registration.competition_category}
                                </p>
                            </div>

                            <div className="mt-10 rounded-2xl border border-white/15 bg-white/[0.07] p-6">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                                    Ticket Number
                                </p>

                                <p className="mt-3 break-all font-mono text-2xl font-bold tracking-[0.12em] sm:text-3xl">
                                    {registration.ticket_number}
                                </p>
                            </div>
                        </div>

                        <aside className="border-t border-dashed border-white/25 bg-[#202c43] p-7 sm:p-10 lg:border-l lg:border-t-0">
                            <div className="mx-auto max-w-sm">
                                <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                                    Scan at event check-in
                                </p>

                                <TicketQr
                                    ticketPath={ticketPath}
                                    ticketNumber={
                                        registration.ticket_number
                                    }
                                />

                                <p className="mt-5 text-center text-sm leading-6 text-white/65">
                                    Present this QR code when checking in at
                                    the event. A printed or digital copy works.
                                </p>
                            </div>
                        </aside>
                    </section>
                </div>

                <p className="mx-auto mt-7 max-w-2xl text-center text-sm leading-6 text-zinc-500">
                    Keep this ticket available on your phone. Your teacher
                    also has access to a backup copy if you need help at
                    check-in.
                </p>

                <div className="mt-5 text-center">
                    <Link   
                        href="/"
                        className="font-semibold text-[#c8102e] hover:underline"
                    >
                        Latinos In Action Portal
                    </Link>
                </div>
            </div>
        </main>
    );
}

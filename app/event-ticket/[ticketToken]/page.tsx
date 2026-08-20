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
        .from("event-registrations")
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
        <main className="min-h-screen bg-[#f8f3f4] px-4 py-10">
            
        </main>
    )
}
import Link from "next/link";
import { 
    CalendarDays, 
    MapPin, 
    Plus,
    Pencil,
    Unlock,
    Lock,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireAdmin } from "@/utils/role-guards";
import { setEventStatus } from "./actions";

type EventPageProps = {
    searchParams: Promise<{
        created?: string;
        updated?: string;
        statusUpdated?: string;
        error?: string;
    }>;
};

function formatEventDate(value: string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
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

export default async function EventsPage({
    searchParams,
}: EventPageProps) {
    const { 
        created,
        updated,
        statusUpdated,
        error: actionError, 
    } = await searchParams;
    const { supabase } = await requireAdmin();

    const { data: events, error } = await supabase
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
                status,
                all_schools,
                created_at  
            `,
        )
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });
    
    if (error) {
        throw new Error(
            `Unable to load events: ${error.message}`,
        );
    }

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <header className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                                Event Management
                            </p>

                            <h1 className="mt-2 text-3xl font-semibold">
                                Events
                            </h1>

                            <p className="mt-2 text-sm text-zinc-600">
                                Create events and choose which schools can participate.
                            </p>
                        </div>

                        <Link
                            href="/events/new"
                            className="inline-flex h-11 items-center gap-2 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            <Plus className="h-4 w-4" />
                            Create Event
                        </Link>
                    </header>

                    {created ? (
                        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            The event was created successfully.
                        </div>
                    ) : null}

                    {updated === "true" ? (
                        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            The event was updated successfully.
                        </div>
                    ) : null}

                    {statusUpdated ? (
                        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            The event status was changed to{" "}
                            <span className="font-semibold">
                                {statusUpdated}
                            </span>
                            .
                        </div>
                    ) : null}

                    {actionError ? (
                        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {actionError === "not-found"
                                ? "That event could not be found."
                                :"The event status could not be changed."}
                        </div>
                    ) : null}

                    <section className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                        <div className="border-b border-zinc-200 px-5 py-4">
                            <p className="text-sm text-zinc-600">
                                <span className="font-semibold text-zinc-900">
                                    {(events ?? []).length}
                                </span>{" "}
                                events
                            </p>
                        </div>

                        <div className="divide-y divide-zinc-200">
                            {(events ?? []).map((event) => {
                                const startTime = formatTime(
                                    event.start_time,
                                );
                                const endTime = formatTime(
                                    event.end_time,
                                );
                                const openEvent = setEventStatus.bind(
                                    null,
                                    event.id,
                                    "open",
                                );
                                const closeEvent = setEventStatus.bind(
                                    null,
                                    event.id,
                                    "closed",
                                );

                                return (
                                    <article
                                        key={event.id}
                                        className="p-5 hover:bg-zinc-50"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <h2 className="text-xl font-semibold text-zinc-950">
                                                    {event.name}
                                                </h2>

                                                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
                                                    <span className="flex items-center gap-2">
                                                        <CalendarDays className="h-4 w-4 text-[#c8102e]" />
                                                        {formatEventDate(
                                                            event.event_date,
                                                        )}
                                                        {startTime
                                                            ? ` at ${startTime}`
                                                            : ""}
                                                        {endTime
                                                            ? `-${endTime}`
                                                            : ""}
                                                    </span>

                                                    <span className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-[#c8102e]" />
                                                        {event.location_name}
                                                    </span>
                                                </div>

                                                <p className="mt-3 text-sm text-zinc-600">
                                                    {event.all_schools
                                                        ? " Eligible: All schools"
                                                        : "Eligible: Selected schools"}
                                                </p>
                                            </div>

                                            <div className="flex flex-col items-end gap-3">
                                                <span
                                                    className={
                                                        event.status === "open"
                                                            ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase text-green-700"
                                                            : event.status === "closed"
                                                                ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase text-amber-700"
                                                                : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase text-zinc-600"
                                                    }
                                                >
                                                    {event.status}
                                                </span>

                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <Link
                                                        href={`/events/${event.id}/edit`}
                                                        className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        Edit
                                                    </Link>

                                                    {event.status === "open" ? (
                                                        <form action={closeEvent}>
                                                            <button
                                                                type="submit"
                                                                className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                                                            >
                                                                <Lock className="h-4 w-4" />
                                                                Close
                                                            </button>
                                                        </form>
                                                    ) : (
                                                        <form action={openEvent}>
                                                            <button
                                                                type="submit"
                                                                className="inline-flex h-9 items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 text-xs font-semibold text-green-700 hover:bg-green-100"
                                                            >
                                                                <Unlock className="h-4 w-4" />
                                                                {event.status === "draft"
                                                                    ? "Publish"
                                                                    : "Reopen"}
                                                            </button>
                                                        </form>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}

                            {(events ?? []).length === 0 ? (
                                <div className="px-5 py-12 text-center text-sm text-zinc-500">
                                    No events have been created yet.
                                </div>
                            ) : null} 
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}

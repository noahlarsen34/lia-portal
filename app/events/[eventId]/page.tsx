import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    Award,
    Building2,
    Search,
    TicketCheck,
    UserCheck,
    Users,
    UserX,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

type EventDetailsPageProps = {
    params: Promise<{eventId: string}>;
    searchParams: Promise<{
        q?: string;
        status?: string;
        school?: string;
        category?: string;
    }>;
};

function relation<T>(value: T | T[] | null) {
    return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function EventDetailPage({
    params,
    searchParams,
}: EventDetailsPageProps) {
    const { eventId } = await params;
    const filters = await searchParams;

    await requireStaff();
    const admin = createAdminClient();

    const [eventResult, registrationsResult] = await Promise.all([
        admin
            .from("lia_events")
            .select(`
                id,
                name,
                event_date,
                location_name,
                capacity,
                status
            `)
            .eq("id", eventId)
            .maybeSingle(),
        
        admin
            .from("event_registrations")
            .select(`
                id,
                first_name,
                last_name,
                student_email,
                grade_level,
                status,
                ticket_number,
                ticket_token,
                checked_in_at,
                schools (
                    id,
                    name
                ),
                teachers (
                    first_name,
                    last_name,
                    name
                ),
                competition_entries:event_competition_entries (
                    id,
                    category,
                    title,
                    external_url
                )
            `)
            .eq("event_id", eventId)
            .order("last_name")
            .order("first_name"),
        
        ]);

    if (eventResult.error) {
        throw new Error(eventResult.error.message);
    }

    if (!eventResult.data) {
        notFound();
    }

    if (registrationsResult.error) {
        throw new Error(registrationsResult.error.message);
    }

    const event = eventResult.data;
    const registrations = registrationsResult.data ?? [];

    const activeRegistrations = registrations.filter(
        (registration) => registration.status !== "withdrawn",
    );

    const withdrawnCount =
        registrations.length - activeRegistrations.length;
    
    const checkedInCount = activeRegistrations.filter(
        (registration) => registration.status === "checked_in",
    ).length;

    const schoolMap = new Map<string, string>();

    for (const registration of activeRegistrations) {
        const school = relation(registration.schools)

        if (school) {
            schoolMap.set(school.id, school.name);
        }
    }

    const competitionCount = activeRegistrations.reduce(
        (total, registration) =>
            total + (registration.competition_entries?.length ?? 0),
            0,
    );

    const remainingCapacity =
        event.capacity == null
            ? null
            : Math.max(
                event.capacity - activeRegistrations.length,
                0,
            );
    
    const q = (filters.q ?? "").trim().toLowerCase();

    const filteredRegistrations = registrations.filter(
        (registration) => {
            const school = relation(registration.schools);
            const entries = registration.competition_entries ?? [];

            const matchesSearch =
                !q ||
                `${registration.first_name} ${registration.last_name}`
                    .toLowerCase()
                    .includes(q) ||
                registration.student_email.toLowerCase().includes(q) ||
                registration.ticket_number.toLowerCase().includes(q) ||
                school?.name.toLowerCase().includes(q);
            
            const matchesStatus =
                !filters.status ||
                registration.status === filters.status;

            const matchesSchool =
                !filters.school || school?.id === filters.school;
            
            const matchesCategory =
                !filters.category ||
                entries.some(
                    (entry) => entry.category === filters.category,
                );
            
            return (
                matchesSearch &&
                matchesStatus &&
                matchesSchool &&
                matchesCategory
            );
        },
    );

    const categories = Array.from(
        new Set(
            registrations.flatMap((registration) =>
                (registration.competition_entries ?? []).map(
                    (entry) => entry.category,
                ),
            ),
        ),
    ).sort();

    const cards = [
        {
            label: "Registrations",
            value: activeRegistrations.length,
            icon: Users,
        },
        {
            label: "Checked in",
            value: checkedInCount,
            icon: UserCheck,
        },
        {
            label: "Remaining capacity",
            value: remainingCapacity ?? "Unlimited",
            icon: TicketCheck,
        },
        {
            label: "Schools represented",
            value: schoolMap.size,
            icon: Building2,
        },
        {
            label: "Competition entries",
            value: competitionCount,
            icon: Award,
        },
        {
            label: "withdrawn",
            value: withdrawnCount,
            icon: UserX,
        },
    ];

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <Link
                        href="/events"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#c8102e] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        All events
                    </Link>

                    <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wide text-[#c8102e]">
                                Event management
                            </p>

                            <h1 className="mt-2 text-3xl font-semibold">
                                {event.name}
                            </h1>

                            <p className="mt-2 text-sm text-zinc-600">
                                {event.event_date}
                                {event.location_name
                                    ? ` · ${event.location_name}`
                                    : ""}
                            </p>
                        </div>

                        <Link
                            href={`/events/${event.id}/check-in`}
                            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#c8102e] px-5 font-semibold text-white hover:bg-[#a70d25]"
                        >
                            <TicketCheck className="h-5 w-5" />
                            Open check-in
                        </Link>
                    </header>

                    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                        {cards.map((card) => {
                            const Icon = card.icon;

                            return (
                                <article
                                    key={card.label}
                                    className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
                                >
                                    <Icon className="h-5 w-5 text-[#c8102e]" />
                                    <p className="mt-4 text-3xl font-bold">
                                        {card.value}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        {card.label}
                                    </p>
                                </article>
                            );
                        })}
                    </section>

                    <form className="mt-7 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(240px,1fr)_180px_220px_220px_auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <input
                                name="q"
                                defaultValue={filters.q}
                                placeholder="Student, email, school, ticket..."
                                className="h-11 w-full rounded-lg border border-zinc-300 pl-10 pr-3"
                            />
                        </div>

                        <select
                            name="status"
                            defaultValue={filters.status ?? ""}
                            className="h-11 rounded-lg border border-zinc-300 px-3"
                        >
                            <option value="">All statuses</option>
                            <option value="registered">Registered</option>
                            <option value="ticket_issued">Ticket issued</option>
                            <option value="checked_in">Checked in</option>
                            <option value="withdrawn">Withdrawn</option>
                        </select>

                        <select
                            name="school"
                            defaultValue={filters.school ?? ""}
                            className="h-11 rounded-lg border border-zinc-300 px-3"
                        >
                            <option value="">All schools</option>
                            {Array.from(schoolMap.entries())
                                .sort((a, b) => 
                                    a[1].localeCompare(b[1]),
                                )
                                .map(([id, name]) => (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                ))}
                        </select>

                        <select
                            name="category"
                            defaultValue={filters.category ?? ""}
                            className="h-11 rounded-lg border border border-zinc-300 px-3"
                        >
                            <option value="">All categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>

                        <button className="h-11 rounded-lg bg-zinc-900 px-5 font-semibold text-white hover:bg-zinc-700">
                            Filter
                        </button>
                    </form>

                    <section className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        {[
                                            "Student",
                                            "School",
                                            "Status",
                                            "Ticket",
                                            "Competitions",
                                            "Check-in",
                                        ].map((heading) => (
                                            <th
                                                key={heading}
                                                className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500"
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-zinc-100">
                                    {filteredRegistrations.map(
                                        (registration) => {
                                            const school = relation(
                                                registration.schools,
                                            );
                                            const entries =
                                                registration.competition_entries ??
                                                [];
                                            
                                            return (
                                                <tr key={registration.id}>
                                                    <td className="px-5 py-4">
                                                        <p className="font-semibold">
                                                            {
                                                                registration.first_name
                                                            }{" "}
                                                            {
                                                                registration.last_name
                                                            }
                                                        </p>
                                                        <p className="mt-1 text-sm text-zinc-500">
                                                            {
                                                                registration.student_email
                                                            }
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-4 text-sm">
                                                        {school?.name ??
                                                            "Unavailable"}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold capitalize">
                                                            {registration.status.replaceAll(
                                                                "_",
                                                                " ",
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <Link
                                                            href={`/event-ticket/${registration.ticket_token}`}
                                                            target="_blank"
                                                            className="font-mono text-sm font-semibold text-[#c8102e] hover:underline"
                                                        >
                                                            {
                                                                registration.ticket_number
                                                            }
                                                        </Link>
                                                    </td>

                                                    <td className="px-5 py-4 text-sm">
                                                        {entries.length
                                                            ? entries
                                                                  .map(
                                                                      (
                                                                          entry,
                                                                      ) =>
                                                                          entry.category,
                                                                  )
                                                                  .join(", ")
                                                            : "None"}
                                                    </td>

                                                    <td className="px-5 py-4 text-sm">
                                                        {registration.checked_in_at
                                                            ? new Intl.DateTimeFormat(
                                                                  "en-US",
                                                                  {
                                                                      timeStyle:
                                                                          "short",
                                                                      timeZone:
                                                                          "America/Denver",
                                                                  },
                                                              ).format(
                                                                  new Date(
                                                                      registration.checked_in_at,
                                                                  ),
                                                              )
                                                            : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredRegistrations.length === 0 ? (
                            <p className="p-10 text-center text-sm text-zinc-500">
                                No registrations match these filters.
                            </p>
                        ) : null}
                    </section>
                </div>
            </section>
        </main>
    );
}

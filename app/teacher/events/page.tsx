import { CalendarDays, MapPin } from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import {
    getTeacherEventDirectionsHref,
    hasConfirmedTeacherEventLocation,
    upcomingTeacherEvents,
} from "@/utils/teacher-events";

export default async function TeacherEventsPage() {
    await requireTeacher();

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
                    Keep track of upcoming Latinos In Action gatherings,
                    celebrations, and professional learning opportunities.
                </p>
            </header>

            <section className="mt-6 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5 sm:px-8">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-950">
                            Event Schedule
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600">
                            More event details will be added as they are confirmed.
                        </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#c8102e]">
                        {upcomingTeacherEvents.length} upcoming
                    </span>
                </div>

                <div className="divide-y divide-zinc-200">
                    {upcomingTeacherEvents.map((event) => (
                        <article
                            key={event.id}
                            className="flex flex-col gap-5 px-6 py-6 transition-colors hover:bg-zinc-50/70 sm:flex-row sm:items-center sm:gap-6 sm:px-8"
                        >
                            <div className="w-20 shrink-0 self-start overflow-hidden rounded-md border border-red-100 bg-white text-center sm:self-center">
                                <div className="bg-[#c8102e] py-1.5 text-xs font-semibold uppercase text-white">
                                    {event.month}
                                </div>

                                <div
                                    className={`flex h-12 items-center justify-center font-bold text-zinc-950 ${
                                        event.day === "TBD"
                                            ? "text-sm"
                                            : "text-2xl"
                                    }`}
                                >
                                    {event.day}
                                </div>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold uppercase text-[#c8102e]">
                                    {event.category}
                                </p>

                                <h3 className="mt-1 text-2xl font-bold text-zinc-950">
                                    {event.title}
                                </h3>

                                <p className="mt-2 max-w-3xl leading-7 text-zinc-600">
                                    {event.description}
                                </p>

                                <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-700 md:flex-row md:flex-wrap md:gap-x-8 md:gap-y-2">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 shrink-0 text-[#c8102e]" />
                                        <span>{event.dateLabel}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 shrink-0 text-[#c8102e]" />
                                        {hasConfirmedTeacherEventLocation(event) ? (
                                            <a
                                                href={getTeacherEventDirectionsHref(event)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-[#c8102e] hover:decoration-[#c8102e]"
                                                aria-label={`Get directions to ${event.location}`}
                                            >
                                                {event.location}
                                            </a>
                                        ) : (
                                            <span>{event.location}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

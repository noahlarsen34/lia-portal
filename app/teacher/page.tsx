import Link from "next/link";
import {
    AwardIcon,
    BookOpen,
    CalendarDays,
    FolderOpen,
    GraduationCap,
    Megaphone,
    MessagesSquare,
    Users,
    type LucideIcon,
} from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import {
    getTeacherEventDirectionsHref,
    hasConfirmedTeacherEventLocation,
    upcomingTeacherEvents,
} from "@/utils/teacher-events";

type ActionCard = {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
};

const actionCards: ActionCard[] = [
    {
        title: "Create & Update Class Information",
        description: "Add new classes and keep your information up to date.",
        href: "/teacher/classes",
        icon: Users,
    },
    {
        title: "View & Register For Events",
        description: "See upcoming LIA events, deadlines, and important dates.",
        href: "/teacher/events",
        icon: CalendarDays,
    },
    {
        title: "Complete Teacher Modules",
        description: "Access training modules designed to support and inspire you.",
        href:"/teacher/modules",
        icon: BookOpen,
    },
    {
        title: "View Announcements",
        description: "Stay informed with the latest updates.",
        href: "/teacher/announcements",
        icon: Megaphone,
    },
    {
        title: "Access the Curriculum",
        description: "Use the curriculum to build your lessons.",
        href: "/teacher/resources",
        icon: FolderOpen,
    },
    {
        title: "View Uploaded Assignments",
        description: "View assignments students have uploaded to your classes.",
        href: "/teacher/microcredentials",
        icon: AwardIcon,
    }
];

{upcomingTeacherEvents.map((event) => (
    <div key={event.id} className="flex gap-3 py-4">
        <div className="w-14 shrink-0 overflow-hidden rounded-md border border-red-100 text-center">
            <div className="bg-[#c4122f] py-1 text-xs font-bold uppercase text-white">
                {event.month}
            </div>

            <div
                className={`flex h-11 items-center justify-center bg-red-50 font-black text-zinc-900 ${
                    event.day === "TBD" ? "text-xs" : "text-xl"
                }`}
            >
                {event.day}
            </div>
        </div>

        <div className="min-w-0">
            <h3 className="font-bold text-zinc-950">
                {event.title}
            </h3>

            <p className="text-sm text-zinc-600">
                {event.dateLabel}
            </p>

            {hasConfirmedTeacherEventLocation(event) ? (
                <a
                    href={getTeacherEventDirectionsHref(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-[#c4122f]"
                >
                    {event.location}
                </a>
            ) : (
                <p className="text-sm text-zinc-600">{event.location}</p>
            )}
        </div>
    </div>
))}

const resources = [
    { label: "Teacher Toolkit", href: "/teacher/resources/page/6796" },
    { label: "Program Guide", href: "https://drive.google.com/file/d/111mHToRoejdYJw_L9Ah5HvlWwYL40zXD/view" },
    { label: "LIA Website", href: "https://latinosinaction.org/" },
];

export default async function TeacherDashBoardPage() {
    const { supabase, profile } = await requireTeacher();
    const displayName = profile.full_name ?? "Teacher";

    const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("school_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

    if (teacherError) {
        throw new Error(`Unable to load teacher assignment: ${teacherError.message}`);
    }

    let assignedRpmId: string | null = null;

    if (teacher?.school_id) {
        const { data: school, error: schoolError } = await supabase
            .from("schools")
            .select("assigned_rpm_id")
            .eq("id", teacher.school_id)
            .maybeSingle();

        if (schoolError) {
            throw new Error(`Unable to load school assignment: ${schoolError.message}`);
        }

        assignedRpmId = school?.assigned_rpm_id ?? null;
    }

    let announcementsQuery = supabase
        .from("announcements")
        .select("id, title, body, published_at")
        .eq("status", "published");

    announcementsQuery = assignedRpmId
        ? announcementsQuery.or(
            `audience.eq.all_teachers,target_rpm_id.eq.${assignedRpmId}`,
        )
        : announcementsQuery.eq("audience", "all_teachers");

    const { data: announcements, error: announcementsError } =
        await announcementsQuery
            .order("published_at", { ascending: false })
            .limit(2);

    if (announcementsError) {
        throw new Error(
            `Unable to load recent announcements: ${announcementsError.message}`,
        );
    }

    return (
        <div className="mx-auto max-w-7xl">
            <header className="mb-6 overflow-hidden rounded-md border border-red-100 bg-white">
                <div className="relative px-6 py-8 text-center sm:px-10">
                    <p className="text-sm font-semibold text-zinc-700">
                        Welcome, {displayName}
                    </p>
                    <h1 className="mt-2 text-4xl font-black uppercase tracking-normal text-[#c4122f] sm:text-5xl">
                        Teacher Dashboard
                    </h1>
                    <p className="mx-auto mt-3 max-w-2xl text-lg font-medium text-zinc-700">
                        Your hub for classes, events, learning, and connecting with the LIA
                        educator community.
                    </p>
                    <div className="mx-auto mt-5 h-1 w-40 rounded-full bg-[#c4122f]" />
                </div>
            </header>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                        <h2 className="text-xl font-bold uppercase text-zinc-900">
                            Welcome Back!
                        </h2>
                        <p className="text-sm text-zinc-600">
                            Here&apos;s what&apos;s happening in your LIA community.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {actionCards.map((card) => {
                            const Icon = card.icon;

                            return (
                                <Link
                                    key={card.href}
                                    href={card.href}
                                    className="group flex min-h-56 flex-col items-center justify-between rounded-md border border-zinc-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                                >
                                    <div>
                                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-[#c4122f]">
                                            <Icon className="h-10 w-10" aria-hidden />
                                        </div>
                                        <h3 className="mt-4 text-lg font-bold leading-tight text-zinc-950">
                                            {card.title}
                                        </h3>
                                        <p className="mt-3 text-sm leading-6 text-zinc-600">
                                            {card.description}
                                        </p>
                                    </div>

                                    <div className="mt-5 h-0.5 w-12 bg-[#c4122f] transition group-hover:w-20" />
                                </Link>
                            );
                        })}
                    </div>
                </section>

                <aside className="space-y-4">
                    <section className="overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                        <h2 className="bg-[#c4122f] px-4 py-2 text-sm font-bold uppercase text-white">
                            Recent Announcements
                        </h2>
                        <div className="divide-y divide-red-100 px-4">
                            {announcements.length > 0 ? (
                                announcements.map((announcement) => (
                                    <Link
                                        key={announcement.id}
                                        href="/teacher/announcements"
                                        className="block py-4 transition hover:bg-red-50/60"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <h3 className="font-bold text-zinc-950">
                                                {announcement.title}
                                            </h3>
                                            {announcement.published_at ? (
                                                <time className="text-xs font-medium text-zinc-500">
                                                    {new Intl.DateTimeFormat("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    }).format(new Date(announcement.published_at))}
                                                </time>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">
                                            {announcement.body}
                                        </p>
                                    </Link>
                                ))
                            ) : (
                                <p className="py-5 text-sm text-zinc-600">
                                    No announcements have been published yet.
                                </p>
                            )}
                        </div>
                        <Link
                            href="/teacher/announcements"
                            className="block px-4 pb-4 text-right text-sm font-bold text-[#c4122f]"
                        >
                            View all announcements
                        </Link>
                    </section>

                    <section className="overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                        <h2 className="bg-[#c4122f] px-4 py-2 text-sm font-bold uppercase text-white">
                            Upcoming Events
                        </h2>
                        <div className="divide-y divide-red-100 px-4">
                            {upcomingTeacherEvents.map((event) => (
                                <div key={`${event.month}-${event.day}`} className="flex gap-3 py-4">
                                    <div className="w-14 shrink-0 overflow-hidden rounded-md border border-red-100 text-center">
                                        <div className="bg-[#c4122f] py-1 text-xs font-bold uppercase text-white">
                                            {event.month}
                                        </div>
                                        <div className="bg-red-50 py-2 text-xl font-black text-zinc-900">
                                            {event.day}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-950">{event.title}</h3>
                                        <p className="text-sm text-zinc-600">{event.dateLabel}</p>
                                        {hasConfirmedTeacherEventLocation(event) ? (
                                            <a
                                                href={getTeacherEventDirectionsHref(event)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-[#c4122f]"
                                            >
                                                {event.location}
                                            </a>
                                        ) : (
                                            <p className="text-sm text-zinc-600">
                                                {event.location}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link
                            href="/teacher/events"
                            className="block px-4 pb-4 text-right text-sm font-bold text-[#c4122f]"
                        >
                            View all events
                        </Link>
                    </section>

                    <section className="overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                        <h2 className="flex items-center gap-2 bg-[#c4122f] px-4 py-2 text-sm font-bold uppercase text-white">
                            <FolderOpen className="h-4 w-4" aria-hidden />
                            Quick Resources
                        </h2>
                        <div className="divide-y divide-red-100">
                            {resources.map((resource) => (
                                <Link
                                    key={resource.label}
                                    href={resource.href}
                                    className="flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-800 transition hover:bg-red-50"
                                >
                                    <span>{resource.label}</span>
                                    <span aria-hidden>›</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>

            <footer className="mt-6 text-center text-sm font-bold uppercase tracking-wide text-zinc-800">
                Together, we empower. Together, we lead. Together, we change lives.
            </footer>
        </div>
    );
}

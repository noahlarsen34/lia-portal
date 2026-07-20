"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BookOpen,
    CalendarDays,
    CircleUserRound,
    FolderOpen,
    GraduationCap,
    Home,
    LogOut,
    Megaphone,
    Menu,
    MessagesSquare,
    Users,
    X,
    Award,
} from "lucide-react";
import { useEffect, useState } from "react";
import { signOut } from '@/app/login/actions';
import { teacherModulePageSlugs } from "@/utils/curriculum-links";

type TeacherLink = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean}>;
};

const teacherLinks: TeacherLink[] = [
    { href: "/teacher", label: "Dashboard", icon: Home},
    { href: "/teacher/classes", label: "My Classes", icon: Users },
    { href: "/teacher/events", label: "Events", icon: CalendarDays },
    {
        href: "/teacher/microcredentials",
        label: "Microcredentials",
        icon: Award,
    },
    { href: "/teacher/modules", label: "Teacher Modules", icon: BookOpen },
    { href: "/teacher/discussions", label: "Discussions", icon: MessagesSquare },
    { href: "/teacher/announcements", label: "Announcements", icon: Megaphone },
    { href: "/teacher/resources", label: "Curriculum", icon: FolderOpen },
    { href: "/teacher/profile", label: "Profile", icon: CircleUserRound },
];

function isTeacherModuleResourcePath(pathname: string) {
    const match = pathname.match(/^\/teacher\/resources\/page\/([^/]+)$/);
    const currentSlugOrId = match?.[1];

    return currentSlugOrId
        ? teacherModulePageSlugs.includes(
            currentSlugOrId as (typeof teacherModulePageSlugs)[number],
        )
        : false;
}

function TeacherNav({ onNavigate }: { onNavigate?: () => void}) {
    const pathname = usePathname();
    const isTeacherModulePage = isTeacherModuleResourcePath(pathname);

    return (
        <nav className="flex flex-1 flex-col gap-2">
            {teacherLinks.map((link) => {
                const Icon = link.icon;
                const isCurrent = isTeacherModulePage
                    ? link.href === "/teacher/modules"
                    : link.href === "/teacher"
                    ? pathname === link.href
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
                
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={onNavigate}
                        className={
                            isCurrent
                                ? "flex items-center gap-3 rounded-md bg-white px-3 py-3 font-semibold text-[#b90f24] shadow-sm"
                                : "flex items-center gap-3 rounded-md px-3 py-3 font-semibold text-white/90 transition hover:bg-white/10"
                        }
                    >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden />
                        <span>{link.label}</span>
                    </Link>
                );
            })}

            <form action={signOut} className="mt-1">
                <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left font-semibold text-white/90 transition hover:bg-white/10"
                >
                    <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                    <span>Logout</span>
                </button>
            </form>
        </nav>
    );
}

export function TeacherSideBarClient({
        displayName,
    } : {
        displayName: string;
    }) {
        const [isOpen, setIsOpen] = useState(false);
        const pathname = usePathname();

        useEffect(() => {
            setIsOpen(false);
        }, [pathname]);

        return (
            <>
                <header className="sticky top-0 z-40 border-b border-red-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
                    <div className="flex items-center justify-between gap-3">
                        <Link href="/teacher" className="min-w-0">
                            <Image
                                src="/lia-logo.png"
                                alt="Latinos In Action logo"
                                width={144}
                                height={60}
                                className="h-10 w-auto"
                                priority
                            />
                        </Link>

                        <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 shadow-sm"
                            aria-label="Open navigation menu"
                            onClick={() => setIsOpen(true)}
                        >
                            <Menu className="h-5 w-5" aria-hidden />
                        </button>
                    </div>
                </header>

                <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-[#c4122f] text-white lg:flex">
                    <Link
                        href="/teacher"
                        className="block border-r border-red-100 bg-[#f8f4f4] px-5 py-6"
                    >
                        <Image
                            src="/lia-logo.png"
                            alt="Latinos in Action logo"
                            width={190}
                            height={80}
                            className="h-auto w-full"
                            priority
                        />
                    </Link>

                    <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
                        <TeacherNav />

                        <div className="mt-6 border-t border-white/30 pt-5 text-center text-xs font-bold uppercase leading-relaxed tracking-wide">
                            Empowering Latino Youth Through Education
                        </div>

                        <div className="mt-4 rounded-md border border-white/20 bg-white/10 pt-3 text-sm">
                            <div className="break-words font-semibold">{displayName}</div>
                            <div className="text-white/70">Teacher Portal</div>
                        </div>
                    </div>
                </aside>

                <div
                    className={
                        isOpen
                            ? "fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] lg:hidden"
                            : "pointer-events-none fixed inset-0 z-50 bg-black/0 lg:hidden"
                    }
                    aria-hidden="true"
                    onClick={() => setIsOpen(false)}
                />

                <aside
                    className={
                        isOpen
                            ? "fixed left-0 top-0 z-50 flex h-dvh w-[min(20rem,86vw)] translate-x-0 flex-col bg-[#c4122f] text-white shadow-2xl transition-transform duration-200 lg:hidden"
                            : "fixed left-0 top-0 z-50 flex h-dvh w-[min(20rem, 86vw)] -translate-x-full flex-col bg-[#c4122f] text-white shadow-2xl transition-transform duration-200 lg:hidden"
                    }
                >
                    <div className="flex items-center justify-between gap-3 bg-[#f8f4f4] px-5 py-5">
                        <Link href="/teacher" onClick={() => setIsOpen(false)}>
                            <Image
                                src="/lia-logo.png"
                                alt="Latinos in Action logo"
                                width={150}
                                height={62}
                                className="h-auto w-40"
                                priority
                            />
                        </Link>

                        <button
                            type="submit"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 shadow-sm"
                            aria-label="Close navigation menu"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-5 w-5" aria-hidden />
                        </button>
                    </div>

                    <div className="flex-min-h-0 flex-1 flex-col px-5 py-5">
                        <TeacherNav onNavigate={() => setIsOpen(false)} />
                    </div>
                </aside>
            </>
        );
        
    }

import Link from "next/link";
import {
    BookOpen,
    Building2,
    ExternalLink,
    FileText,
    FolderOpen,
    GraduationCap,
    Users,
    Video,
    type LucideIcon,
} from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import { curriculumTabs } from "@/utils/curriculum-links";
import {
    canViewCurriculumSection,
    type CurriculumSectionKey,
} from '@/utils/teacher-curriculum-access';

const curriculumIcons: Record<string, LucideIcon> = {
    elementary: BookOpen,
    "high-school": GraduationCap,
    "middle-school": Building2,
    "lia-docs": FileText,
    "by-teachers": Users,
    "video-library": Video,
};

export default async function TeacherResourcesPage() {
    const { supabase, profile } = await requireTeacher();

    let programLevel: string | null = null;

    if (profile.role === "teacher") {
        const { data: teacher, error: teacherError } = await supabase
            .from("teachers")
            .select("program_level")
            .eq("profile_id", profile.id)
            .maybeSingle();
        
        if (teacherError) {
            throw new Error(
                `Unable to load teacher curriculum access: ${teacherError.message}`,
            );
        }

        programLevel = teacher?.program_level ?? null;
    }

    const visibleCurriculumTabs =
        profile.role === "admin"
            ? curriculumTabs
            : curriculumTabs.filter((section) =>
                canViewCurriculumSection(
                    programLevel,
                    section.key as CurriculumSectionKey,
                ),
            );

    return (
        <div className="mx-auto max-w-7xl">
            <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Teacher Resources
                </p>

                <h1 className="mt-2 text-3xl font-semibold">
                    Resources and Curriculum
                </h1>

                <p className="mt-1 text-sm text-zinc-600">
                    Access Educator Institute materials, LIA curriculum, videos,
                    documents, and other teacher resources.
                </p>
            </section>

            <a
                href="https://drive.google.com/drive/folders/1S8rQZDsxet7PphIUIlZWwdDWT5Yhv6qy?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-5 block rounded-md border border-red-200 bg-white p-5 shadow-sm transition hover:border-[#c4122f] hover:shadow-md sm:p-6"
            >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-red-50 text-[#c4122f] ring-1 ring-red-100">
                            <FolderOpen
                                className="h-6 w-6"
                                aria-hidden="true"
                            />
                        </span>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold text-zinc-950">
                                    Educator Institutes
                                </h2>

                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#c4122f]">
                                    Featured
                                </span>
                            </div>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                                Access presentations, materials, and resources
                                from all LIA Educator Institutes.
                            </p>
                        </div>
                    </div>

                    <span className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white transition group-hover:bg-[#a70d25]">
                        Open Google Drive
                        <ExternalLink
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    </span>
                </div>
            </a>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCurriculumTabs.map((section) => {
                    const Icon = curriculumIcons[section.key] ?? FolderOpen;
                    const href =
                        "href" in section
                            ? section.href
                            : section.source.type === "page"
                            ? `/teacher/resources/page/${section.source.id}`
                            : null;
                    const isReady = Boolean(href);
                    const isExternal = href?.startsWith("http");

                    const content = (
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-[#c4122f] ring-1 ring-red-100">
                                        <Icon size={21} strokeWidth={2.2} aria-hidden />
                                    </span>
                                    <h2 className="text-lg font-semibold text-zinc-950">
                                        {section.label}
                                    </h2>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-zinc-600">
                                    {section.description}
                                </p>
                            </div>

                            {!isReady ? (
                                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
                                    Coming soon
                                </span>
                            ) : null}
                        </div>
                    );

                    const activeClassName =
                        "rounded-md border border-red-100 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md";
                    const disabledClassName =
                        "rounded-md border border-zinc-200 bg-zinc-50 p-5 shadow-sm";

                    return isReady && href ? (
                        <Link
                            key={section.key}
                            href={href}
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noreferrer" : undefined}
                            className={activeClassName}
                        >
                            {content}
                        </Link>
                    ) : (
                        <div
                            key={section.key}
                            className={disabledClassName}
                            aria-disabled="true"
                        >
                            {content}
                        </div>
                    );
                })}
            </section>
        </div>
    );
}

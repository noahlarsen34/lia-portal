import Link from "next/link";
import {
    BookOpen,
    Building2,
    FileText,
    FolderOpen,
    GraduationCap,
    Users,
    Video,
    type LucideIcon,
} from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import { curriculumTabs } from "@/utils/curriculum-links";

const curriculumIcons: Record<string, LucideIcon> = {
    elementary: BookOpen,
    "high-school": GraduationCap,
    "middle-school": Building2,
    "lia-docs": FileText,
    "by-teachers": Users,
    "video-library": Video,
};

export default async function TeacherResourcesPage() {
    await requireTeacher();

    return (
        <div className="mx-auto max-w-7xl">
            <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Curriculum
                </p>
                <h1 className="mt-2 text-3xl font-semibold">LIA Curriculum</h1>
                <p className="mt-1 text-sm text-zinc-600">
                    Open LIA curriculum resources from the existing curriculum site.
                </p>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {curriculumTabs.map((section) => {
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

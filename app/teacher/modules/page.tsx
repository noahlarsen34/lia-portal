import Link from "next/link";
import pages from '@/data/curriculum/wordpress-pages.json';
import { requireTeacher } from "@/utils/role-guards";
import { getImportedCurriculumPage } from "@/utils/imported-curriculum";

type ImportedPage = {
    id: number;
    title: string;
    slug: string;
    link: string;
    content: string;
};

type ModuleSection = {
    title: string;
    lessons: {
        title: string;
        href: string;
        isExternal: boolean;
    }[];
};

function getText(value: string) {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getHref(value: string) {
    const match = value.match(/href="([^"]*)"/i);
    return match?.[1] ?? null;
}

function getPortalHref(href: string) {
    const wordpressOriginMatch = href.match(/^https?:\/\/program\.latinosinaction\.org/i);
    const wordpressOrigin = wordpressOriginMatch?.[0];

    if (!wordpressOrigin) {
        return href;
    }

    const slug = href
        .slice(wordpressOrigin.length)
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .at(-1)

    if (!slug) {
        return href;
    }

    if (slug === "module-5-completion-quiz") {
        return "/teacher/modules/completion-quiz";
    }

    const importedPage = getImportedCurriculumPage(slug);

    return importedPage
        ? `/teacher/resources/page/${importedPage.slug}`
        : href;
}

function parseTeacherModules() {
    const rootPage = (pages as ImportedPage[]).find(
        (page) => page.id === 11535 || page.slug === "new-teacher-modules",
    );

    if (!rootPage) {
        return [];
    }

    const modules: ModuleSection[] = [];
    const detailsRegex = /<details\b[^>]*>([\s\S]*?)<\/details>/gi;
    let detailsMatch: RegExpExecArray | null;

    while ((detailsMatch = detailsRegex.exec(rootPage.content)) !== null) {
        const detailsHtml = detailsMatch[1];
        const title = getText(
            detailsHtml.match(/<summary[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "",
        );
        const moduleNumber = title.match(/Module\s+(\d+)/i)?.[1];

        if (!title || !moduleNumber) {
            continue;
        }

        const lessons: ModuleSection["lessons"] = [];
        const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
        let linkMatch: RegExpExecArray | null;

        while ((linkMatch = linkRegex.exec(detailsHtml)) !== null) {
            const href = getHref(linkMatch[1]);
            const lessonTitle = getText(linkMatch[2]);

            if (!href || !lessonTitle.startsWith(`${moduleNumber}.`)) {
                continue;
            }

            const portalHref = getPortalHref(href);

            lessons.push({
                title: lessonTitle,
                href: portalHref,
                isExternal:
                    !portalHref.startsWith("/teacher/resources/") &&
                    !portalHref.startsWith("/teacher/modules/"),
            });
        }

        modules.push({
            title,
            lessons,
        });
    }

    return modules;
}

export default async function TeacherModulesPage() {
    await requireTeacher();

    const modules = parseTeacherModules();

    return (
        <div className="mx-auto max-w-5xl">
            <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Teacher Modules
                </p>
                <h1 className="mt-2 text-3xl font-semibold">
                    New Teacher Modules
                </h1>

                <div className="mt-8 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                    {modules.map((module, index) => (
                        <details
                            key={module.title}
                            className="group border-b border-white last:border-b-0"
                            open={index === 0}
                        >
                            <summary className="flex cursor-pointer list-none items-center gap-5 bg-zinc-100 px-5 py-5 text-zinc-800 transition hover:bg-zinc-200 group-open:bg-[#c4122f] group-open:text-white [&::-webkit-details-marker]:hidden">
                                <span className="w-5 shrinnk-0 text-2xl font-semibold leading-none group-open:hidden">
                                    +
                                </span>
                                <span className="hidden w-5 shrink-0 text-2xl font-semibold leading-none group-open:inline">
                                    -
                                </span>
                                <h2 className="text-xl font-semibold">
                                    {module.title}
                                </h2>
                            </summary>

                            <div className="divide-y divide-zinc-200 bg-zinc-50 px-6 py-3 sm:px-10">
                                {module.lessons.map((lesson) => (
                                    <Link
                                        key={`${module.title}-${lesson.title}`}
                                        href={lesson.href}
                                        target={lesson.isExternal ? "_blank" : undefined}
                                        rel={lesson.isExternal ? "noreferrer" : undefined}
                                        className="block px-1 py-4 text-base font-medium text-zinc-700 transition hover:text-[#c4122f]"
                                    >
                                        {lesson.title}
                                    </Link>
                                ))}
                            </div>
                        </details>
                    ))}
                </div>
            </section>
        </div>
    );
}

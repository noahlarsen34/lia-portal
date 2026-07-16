import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import {
    getWordPressContent,
    type WordPressContentType,
} from "@/utils/wordpress";
import { getImportedCurriculumPage } from "@/utils/imported-curriculum";

type WordPressResourcePageProps = {
    params: Promise<{
        type: string;
        id: string;
    }>;
};

type CurriculumUnit = {
    title: string;
    lessons: {
        title: string;
        href: string;
    }[];
};

type CurriculumBook = {
    title: string | null;
    units: CurriculumUnit[];
};

function isWordPressContentType(type: string): type is WordPressContentType {
    return type === "page" || type === "post";
}

function decodeWordPressEntities(value: string) {
    return value
        .replace(/&#(\d+);/g, (_match, code: string) =>
            String.fromCharCode(Number(code)),
        )
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function normalizeWordPressContent(value: string) {
    return decodeWordPressEntities(value)
        .replace(/[“”″]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\r\n/g, "\n")
        .replace(/\u00a0/g, " ");
}

function parseShortcodeAttributes(value: string) {
    const attributes: Record<string, string> = {};
    const attributeRegex = /([\w-]+)="([^"]*)"/g;
    let match: RegExpExecArray | null;

    while ((match = attributeRegex.exec(value)) !== null) {
        attributes[match[1]] = match[2].trim();
    }

    return attributes;
}

function preparePortalLinks(html: string) {
    return html.replace(
        /href="https:\/\/program\.latinosinaction\.org\/([^"#?]+)\/?"/g,
        (_match, path: string) => {
            const pathParts = path.split("/").filter(Boolean);
            const slug = pathParts.at(-1);

            if (!slug || path.startsWith("wp-content")) {
                return `href="https://program.latinosinaction.org/${path}`;
            }

            const importedPage = getImportedCurriculumPage(slug);

            if (!importedPage) {
                return `href="https://program.latinosinaction.org/${path}`;
            }

            return `href="/teacher/resources/page/${importedPage.slug}`;
        },
    );
}

function getPortalResourceHref(href: string) {
    const wordpressOrigin = "https://program.latinosinaction.org";

    if (!href.startsWith(wordpressOrigin)) {
        return href;
    }

    const pathname = href
        .slice(wordpressOrigin.length)
        .replace(/^\/+|\/+$/g, "");
    const pathParts = pathname.split("/").filter(Boolean);
    const slug = pathParts.at(-1);

    if (!slug || pathParts[0] === "wp-content") {
        return href;
    }

    const importedPage = getImportedCurriculumPage(slug);

    if (!importedPage) {
        return href;
    }

    return `/teacher/resources/page/${importedPage.slug}`;
}

function shouldOpenInNewTab(href: string) {
    return !href.startsWith("/teacher/resources/");
}

function getElementaryUnitTitle(lessonTitle: string) {
    if (/^(?:1\.|Fundamentals\b)/i.test(lessonTitle)) {
        return "01 Fundamentals";
    }

    if (/^(?:2\.|Relationships\b)/i.test(lessonTitle)) {
        return "02 Relationships";
    }

    if (/^(?:3\.|Responsibility\b)/i.test(lessonTitle)) {
        return "03 Responsibility";
    }

    return null;
}

function parseCurriculumBook(html: string): CurriculumBook | null {
    const decodedHtml = normalizeWordPressContent(html);

    if (!decodedHtml.includes("[nectar_horizontal_list_item")) {
        return null;
    }

    const titleMatch = decodedHtml.match(
        /(?:<strong>\s*)?([^<\n]*Curriculum Book)(?:\s*<\/strong>)?/i,
    );
    const lessonRegex = /\[nectar_horizontal_list_item\b([^\]]*)\]/g;
    const lessonMatches = [...decodedHtml.matchAll(lessonRegex)];

    const units = lessonMatches.reduce<CurriculumUnit[]>((currentUnits, match) => {
        const attributes = parseShortcodeAttributes(match[1]);
        const lessonTitle = attributes.col_1_content;
        const lessonHref = attributes.url;

        if (!lessonTitle || !lessonHref) {
            return currentUnits;
        }

        const unitTitle =
            getElementaryUnitTitle(lessonTitle) ??
            currentUnits.at(-1)?.title ??
            `Unit ${currentUnits.length + 1}`;
        const unit = currentUnits.find(
            (currentUnit) => currentUnit.title === unitTitle,
        );
        const lesson = {
            title: lessonTitle,
            href: getPortalResourceHref(lessonHref),
        };

        if (unit) {
            unit.lessons.push(lesson);
            return currentUnits;
        }

        return [
            ...currentUnits,
            {
                title: unitTitle,
                lessons: [lesson],
            },
        ];
    }, []);

    if (units.length === 0) {
        return null;
    }

    return {
        title: titleMatch?.[1].trim() ?? null,
        units,
    };
}

function prepareWordPressHtml(html: string) {
    const normalizedHtml = normalizeWordPressContent(html);

    return preparePortalLinks(normalizedHtml)
        .replace(/\[vc_custom_heading\b([^\]]*)\]/g, (_match, shortcode: string) => {
            const attributes = parseShortcodeAttributes(shortcode);
            const headingText = attributes.text;

            if (!headingText) {
                return "";
            }

            return `<h2>${headingText}</h2>`;
        })
        .replace(/\[tab\b([^\]]*)\]/g, (_match, shortcode: string) => {
            const attributes = parseShortcodeAttributes(shortcode);
            const tabTitle = attributes.title;

            if (!tabTitle) {
                return "";
            }

            return `<h2 class="portal-wp-tab-heading">${tabTitle}</h2>`;
        })
        .replace(/\[nectar_btn\b([^\]]*)\]/g, (_match, shortcode: string) => {
            const attributes = parseShortcodeAttributes(shortcode);
            const label = attributes.text;
            const href = attributes.url;

            if (!label || !href) {
                return "";
            }

            const portalHref = getPortalResourceHref(href);
            const navClass = /next/i.test(label)
                ? "portal-wp-button-next"
                : "portal-wp-button-previous";
            const target = shouldOpenInNewTab(portalHref)
                ? ' target="_blank" rel="noreferrer"'
                : "";

            return `<a href="${portalHref}"${target} class="portal-wp-button ${navClass}">${label}</a>`;
        })
        .replace(
            /\[(?:\/)?(?:vc_row|vc_column|vc_row_inner|vc_column_inner|vc_column_text|divider|tabbed_section|tab)\b[^\]]*\]/g,
            "",
        )
        .replace(/\[(?:\/)?(?:vc_row|vc_column|vc_row_inner|vc_column_inner|vc_column_text|divider|tabbed_section|tab)\]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .replace(
            /(<a\b[^>]*class="[^"]*portal-wp-button[^"]*portal-wp-button-previous[^"]*"[^>]*>\s*Previous Lesson\s*<\/a>)\s*(<a\b[^>]*class="[^"]*portal-wp-button[^"]*portal-wp-button-next[^"]*"[^>]*>\s*Next Lesson\s*<\/a>)/g,
            '<div class="portal-wp-nav-row">$1$2</div>',
        )
        .replace(
            /<a\b([^>]*)>(\s*(?:←\s*)?(?:Return to Module \d+|Previous Lesson|Next Module)(?:\s*→)?\s*)<\/a>/g,
            (_match, attributes: string, label: string) => {
                const navClass = label.includes("Next Module")
                    ? "portal-wp-button-next"
                    : "portal-wp-button-previous";
                const nextAttributes = attributes.includes("class=")
                    ? attributes.replace(
                        /class="([^"]*)"/,
                        `class="$1 portal-wp-button ${navClass}"`,
                    )
                    : `${attributes} class="portal-wp-button ${navClass}"`;

                return `<a${nextAttributes}>${label}</a>`;
            },
        );
}

export default async function WordPressResourcesPage({
    params,
}: WordPressResourcePageProps) {
    await requireTeacher();

    const { type, id } = await params;

    if (!isWordPressContentType(type)) {
        notFound();
    }

    const wordpressPage = await getWordPressContent(type, id);
    const importedPage = wordpressPage ? null : getImportedCurriculumPage(id);

    const page = wordpressPage ?? (importedPage
        ? {
            id: importedPage.id,
            link: importedPage.link,
            slug: importedPage.slug,
            type,
            title: {
                rendered: importedPage.title,
            },
            content: {
                rendered: importedPage.content,
            },
        }
        : null);
    
    if (!page) {
        notFound();
    }

    const curriculumBook = parseCurriculumBook(page.content.rendered);

    return (
        <div className="mx-auto max-w-5xl">
            <Link
                href="/teacher/resources"
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to curriculum
            </Link>

            <article className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Curriculum
                </p>

                <h1
                    className="mt-2 text-3xl font-semibold"
                    dangerouslySetInnerHTML={{
                        __html: curriculumBook?.title ?? page.title.rendered,
                    }}
                />

                {curriculumBook ? (
                    <div className="mt-8 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                        {curriculumBook.units.map((unit, index) => (
                            <details
                                key={unit.title}
                                className="group border-b border-white last:border-b-0"
                                open={index === 0}
                            >
                                <summary className="flex cursor-pointer list-none items-center gap-5 bg-zinc-100 px-5 py-5 text-zinc-800 transition hover:bg-zinc-200 group-open:bg-[#c4122f] group-open:text-white [&::-webkit-details-marker]:hidden">
                                    <span
                                        className="w-5 shrink-0 text-2xl font-semibold leading-none group-open:hidden"
                                        aria-hidden
                                    >
                                        +
                                    </span>
                                    <span
                                        className="hidden w-5 shrink-0 text-2xl font-semibold leading-none group-open:inline"
                                        aria-hidden
                                    >
                                        -
                                    </span>
                                    <h2 className="text-xl font-semibold">
                                        {unit.title}
                                    </h2>
                                </summary>

                                <div className="divide-y divide-zinc-200 bg-zinc-50 px-6 py-3 sm:px-10">
                                    {unit.lessons.map((lesson) => (
                                        <Link
                                            key={`${unit.title}-${lesson.title}`}
                                            href={lesson.href}
                                            target={
                                                shouldOpenInNewTab(lesson.href)
                                                    ? "_blank"
                                                    : undefined
                                            }
                                            rel={
                                                shouldOpenInNewTab(lesson.href)
                                                    ? "noreferrer"
                                                    : undefined
                                            }
                                            className="block px-1 py-4 text-base font-medium text-zinc-700 transition hover:text-[#c4122f]"
                                        >
                                            {lesson.title}
                                        </Link>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>
                ) : (
                    <div
                        className="mt-8 max-w-none text-zinc-700 [&_.elementor-button-link]:inline-flex [&_.elementor-button-link]:rounded-md [&_.elementor-button-link]:bg-[#c4122f] [&_.elementor-button-link]:px-4 [&_.elementor-button-link]:py-2 [&_.elementor-button-link]:text-sm [&_.elementor-button-link]:font-semibold [&_.elementor-button-link]:text-white [&_.elementor-button-link:hover]:bg-[#a70d25] [&_.elementor-button]:text-white [&_.elementor-widget-button_a]:inline-flex [&_.portal-wp-button-next]:ml-auto [&_.portal-wp-button-next]:flex [&_.portal-wp-button-next]:w-fit [&_.portal-wp-button-previous]:flex [&_.portal-wp-button-previous]:w-fit [&_.portal-wp-button]:rounded-md [&_.portal-wp-button]:border [&_.portal-wp-button]:border-red-200 [&_.portal-wp-button]:bg-white [&_.portal-wp-button]:px-4 [&_.portal-wp-button]:py-2 [&_.portal-wp-button]:text-sm [&_.portal-wp-button]:font-semibold [&_.portal-wp-button]:text-[#c4122f] [&_.portal-wp-button:hover]:bg-red-50 [&_.portal-wp-nav-row]:mt-10 [&_.portal-wp-nav-row]:flex [&_.portal-wp-nav-row]:items-center [&_.portal-wp-nav-row]:justify-between [&_.portal-wp-nav-row]:gap-4 [&_.portal-wp-nav-row]:border-t [&_.portal-wp-nav-row]:border-red-100 [&_.portal-wp-nav-row]:pt-6 [&_a:hover]:text-[#a70d25] [&_a]:font-semibold [&_a]:text-[#c4122f] [&_figure]:mx-auto [&_figure]:my-6 [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-zinc-900 [&_img]:mx-auto [&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-2 [&_li]:leading-7 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p]:text-base [&_p]:leading-8 [&_strong]:font-semibold [&_table]:my-4 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:border-zinc-200 [&_table]:bg-white [&_td]:border-t [&_td]:border-zinc-100 [&_td]:p-4 [&_td]:align-top [&_td]:leading-7 [&_td:first-child]:w-1/3 [&_td:first-child]:bg-zinc-50 [&_td:first-child]:font-medium [&_td_a]:mb-2 [&_td_a]:mr-2 [&_td_a]:inline-flex [&_td_a]:rounded-md [&_td_a]:border [&_td_a]:border-red-100 [&_td_a]:bg-red-50 [&_td_a]:px-2.5 [&_td_a]:py-1 [&_td_a]:text-sm [&_td_a:hover]:bg-red-100 [&_tr:first-child_td]:border-t-0 [&_tr:first-child_td]:bg-zinc-50 [&_tr:first-child_td]:font-semibold [&_tr:first-child_td]:text-zinc-800 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_.wp-caption]:mx-auto"
                        dangerouslySetInnerHTML={{
                            __html: prepareWordPressHtml(page.content.rendered),
                        }}
                    />
                )}
            </article>
        </div>
    );
}

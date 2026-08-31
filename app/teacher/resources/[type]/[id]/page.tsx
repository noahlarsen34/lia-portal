import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import {
    getWordPressContent,
    type WordPressContentType,
} from "@/utils/wordpress";
import { getImportedCurriculumPage } from "@/utils/imported-curriculum";
import { canViewCurriculumPage } from "@/utils/teacher-curriculum-access";

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
        href: string | null;
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
        /href="https?:\/\/program\.latinosinaction\.org\/([^"#?]+)\/?"/g,
        (_match, path: string) => {
            const pathParts = path.split("/").filter(Boolean);
            const slug = pathParts.at(-1);

            if (!slug || path.startsWith("wp-content")) {
                return `href="https://program.latinosinaction.org/${path}`;
            }

            if (slug === "new-teacher-modules") {
                return 'href="/teacher/modules"';
            }

            if (slug === "module-5-completion-quiz") {
                return 'href="/teacher/modules/completion-quiz"';
            }

            const importedPage = getImportedCurriculumPage(slug);

            if (!importedPage) {
                return `href="https://program.latinosinaction.org/${path}`;
            }

            return `href="/teacher/resources/page/${importedPage.slug}"`;
        },
    );
}

function getPortalResourceHref(href: string) {
    const wordpressOriginMatch = href.match(/^https?:\/\/program\.latinosinaction\.org/i);
    const wordpressOrigin = wordpressOriginMatch?.[0];

    if (!wordpressOrigin) {
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

    if (slug === "new-teacher-modules") {
        return "/teacher/modules";
    }

    if (slug === "module-5-completion-quiz") {
        return "/teacher/modules/completion-quiz";
    }

    const importedPage = getImportedCurriculumPage(slug);

    if (!importedPage) {
        return href;
    }

    return `/teacher/resources/page/${importedPage.slug}`;
}

function shouldOpenInNewTab(href: string) {
    return (
        !href.startsWith("/teacher/resources/") &&
        !href.startsWith("/teacher/modules") &&
        !href.startsWith("/resources/")
    );
}

function isTeacherModuleLessonPage(pageLink: string, html: string) {
    const firstHeading = getHtmlText(
        normalizeWordPressContent(html).match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1] ?? "",
    );

    return (
        /^Module\s+\d+/i.test(firstHeading) ||
        /^[1-5]\.\d+/.test(firstHeading) ||
        /\/(?:1|2|3|4|5)-\d+[-/]/.test(pageLink) ||
        /\/(?:being-a-culturally-responsive-teacher|crt-teaching|the-four-essentials|understanding-the-30-40-30-model|literacy-tutoring-in-action|planning-tutoring-at-your-school|leadership-committees-class-presidency|teacher-responsibilities-activity-proposals|project-based-assessments-digital-portfolios|additional-curriculum-activities-reflective-journaling|lia-events-and-ongoing-support|module-5-completion-quiz)(?:\/|$)/.test(pageLink)
    );
}

function getBackToCurriculumLink(pageLink: string, html: string) {
    const linkTargets = [
        {
            pattern: /\/lia-elementary(?:\/|$)/,
            href: "/teacher/resources/page/10099",
            label: "Back to Elementary Curriculum",
        },
        {
            pattern: /\/high-school(?:\/|$)/,
            href: "/teacher/resources/page/5817",
            label: "Back to High School Curriculum",
        },
        {
            pattern: /\/lia-middle-school(?:\/|$)/,
            href: "/teacher/resources/page/6263",
            label: "Back to Middle School Curriculum",
        },
        {
            pattern: /\/lia-docs-2(?:\/|$)/,
            href: "/teacher/resources/page/6769",
            label: "Back to LIA Docs",
        },
        {
            pattern: /\/created-by-teachers(?:\/|$)/,
            href: "/teacher/resources/page/6796",
            label: "Back to By Teachers",
        },
    ];
    const target = linkTargets.find((currentTarget) =>
        currentTarget.pattern.test(pageLink),
    );

    if (target) {
        return target;
    }

    if (isTeacherModuleLessonPage(pageLink, html)) {
        return {
            href: "/teacher/modules",
            label: "Back to Teacher Modules",
        };
    }

    return {
        href: "/teacher/resources",
        label: "Back to curriculum",
    };
}

const elementaryUnitTitles: Record<string, string> = {
    "1": "01 Fundamentals",
    "2": "02 Relationships",
    "3": "03 Responsibility",
};

const highSchoolUnitTitles: Record<string, string> = {
    "1": "01 Relationships",
    "2": "02 Personal Goals",
    "3": "03 College Readiness",
    "4": "04 Financial Responsibility",
    "5": "05 Leadership Toolkit",
    "6": "06 Leadership In Action",
    "7": "07 Service Learning",
    "8": "08 Professionalism",
    "9": "09 Self Reliance",
    "10": "10 Self-Discipline",
    "11": "11 Biculturalism",
    "12": "12 Academic Excellence",
    "13": "13 Tutor Training",
};

const middleSchoolUnitTitles: Record<string, string> = {
    "1": "01 Relationships",
    "2": "02 Personal Goals",
    "3": "03 Culture And Society",
    "4": "04 Self-Identity Development",
    "5": "05 Leadership Toolkit",
    "6": "06 Leadership In Action",
    "7": "07 Service Learning",
    "8": "08 Professionalism",
    "9": "09 Self Reliance",
    "10": "10 Self-Discipline",
    "11": "11 Biculturalism",
    "12": "12 Academic Excellence",
    "13": "13 Tutor Training",
};

function getFallbackUnitTitle(lessonTitle: string, curriculumTitle: string) {
    const normalizedCurriculumTitle = normalizeTitleForComparison(curriculumTitle);
    const lessonNumber = lessonTitle.match(/^(\d+)(?:\.|\b)/)?.[1];

    if (normalizedCurriculumTitle.includes("high school")) {
        return lessonNumber ? highSchoolUnitTitles[lessonNumber] ?? null : null;
    }

    if (normalizedCurriculumTitle.includes("middle school")) {
        return lessonNumber ? middleSchoolUnitTitles[lessonNumber] ?? null : null;
    }

    if (normalizedCurriculumTitle.includes("elementary")) {
        if (/^Fundamentals\b/i.test(lessonTitle)) {
            return elementaryUnitTitles["1"];
        }

        if (/^Relationships\b/i.test(lessonTitle)) {
            return elementaryUnitTitles["2"];
        }

        if (/^Responsibility\b/i.test(lessonTitle)) {
            return elementaryUnitTitles["3"];
        }

        return lessonNumber ? elementaryUnitTitles[lessonNumber] ?? null : null;
    }

    return lessonNumber ? `Unit ${lessonNumber}` : null;
}

function normalizeTitleForComparison(title: string) {
    return normalizeWordPressContent(title)
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function getHtmlText(value: string) {
    return value
        .replace(/<[^>]*>/g, " ")
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function removeDuplicateFirstHeading(html: string, pageTitle: string) {
    let hasCheckedFirstHeading = false;
    const normalizedPageTitle = normalizeTitleForComparison(pageTitle);

    return html.replace(
        /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/i,
        (match: string, _level: string, heading: string) => {
            if (hasCheckedFirstHeading) {
                return match;
            }

            hasCheckedFirstHeading = true;

            return normalizeTitleForComparison(heading) === normalizedPageTitle
                ? ""
                : match;
        },
    );
}

function getYouTubeEmbedUrl(url: string) {
    const videoMatch = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/,
    );
    const videoId = videoMatch?.[1];

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function renderYouTubeEmbed(url: string) {
    const embedUrl = getYouTubeEmbedUrl(url);

    if (!embedUrl) {
        return url;
    }

    return `<div class="portal-wp-video"><iframe src="${embedUrl}" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}

function getAttributeValue(value: string, attributeName: string) {
    const escapedAttributeName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const attributeMatch = value.match(
        new RegExp(`${escapedAttributeName}=["']([^"']*)["']`, "i"),
    );

    return attributeMatch?.[1]?.trim() ?? null;
}

function cleanVocabularyHtml(value: string) {
    return cleanWordPressHtmlNesting(value)
        .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
        .replace(/<\/?div\b[^>]*>/gi, "")
        .replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, "");
}

function cleanWordPressHtmlNesting(value: string) {
    return value
        .replace(/<\/?div\b[^>]*class="[^"]*lia-modal__(?:top|middle|bottom)[^"]*"[^>]*>/gi, "")
        .replace(/(^|\n)\s*<\/p>\s*/gi, "$1")
        .replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, "")
        .replace(/<p>\s*(<(?:h[1-4]|section|div)\b[^>]*>)/gi, "$1")
        .replace(/(<\/(?:h[1-4]|section|div)>)\s*<\/p>/gi, "$1")
        .replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, "");
}

function renderSupportSection(resources: string, vocabulary?: string) {
    const resourceContent = cleanWordPressHtmlNesting(resources);
    const vocabularyContent = vocabulary ? cleanVocabularyHtml(vocabulary) : "";
    const hasResources = getHtmlText(resourceContent).length > 0;
    const hasVocabulary = getHtmlText(vocabularyContent).length > 0;

    if (!hasResources && !hasVocabulary) {
        return "";
    }

    const gridClass = hasResources && hasVocabulary
        ? "portal-wp-support-grid"
        : "portal-wp-support-grid portal-wp-support-grid-single";

    return `
            <section class="portal-wp-support-section">
                <h2>Bright Ideas</h2>
                <div class="${gridClass}">
                    ${hasVocabulary ? `
                    <div class="portal-wp-support-card">
                        <h3>Vocabulary</h3>
                        ${vocabularyContent}
                    </div>` : ""}
                    ${hasResources ? `
                    <div class="portal-wp-support-card">
                        <h3>Resources</h3>
                        ${resourceContent}
                    </div>` : ""}
                </div>
            </section>
        `;
}

function getTableCells(rowHtml: string) {
    return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (match) => match[1].trim(),
    );
}

function renderSupportList(cellHtml: string) {
    const items = cleanWordPressHtmlNesting(cellHtml)
        .replace(/<p>([\s\S]*?)<\/p>/gi, "$1\n\n")
        .split(/\s*(?:<br\s*\/?>|(?:\r?\n\s*){2,})\s*/gi)
        .map((item) => item.trim())
        .filter((item) => getHtmlText(item).length > 0);

    if (items.length === 0) {
        return "";
    }

    return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function wrapBrightIdeasTables(html: string) {
    return html.replace(
        /<h3>\s*(?:<(?:strong|b)>)?\s*BRIGHT IDEAS\s*(?:<\/(?:strong|b)>)?\s*<\/h3>\s*(<table\b[^>]*>[\s\S]*?<\/table>)/gi,
        (match, tableHtml: string) => {
            const rows = [
                ...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi),
            ].map((row) => getTableCells(row[1]));

            const headerIndex = rows.findIndex((cells) => {
                const labels = cells.map((cell) =>
                    getHtmlText(cell).toLowerCase(),
                );

                return (
                    labels.some((label) => label.startsWith("vocabulary")) &&
                    labels.some((label) => label === "materials")
                );
            });

            const hasTwoColumnContent = rows.some((cells) => cells.length === 2);

            if (headerIndex === -1 && !hasTwoColumnContent) {
                return match;
            }

            const headers = headerIndex >= 0
                ? rows[headerIndex].map((cell) =>
                    getHtmlText(cell).toLowerCase(),
                )
                : [];
            const vocabularyIndex = headerIndex >= 0
                ? headers.findIndex((label) => label.startsWith("vocabulary"))
                : 0;
            const materialsIndex = headerIndex >= 0
                ? headers.findIndex((label) => label === "materials")
                : 1;
            const contentRows = headerIndex >= 0
                ? rows.slice(headerIndex + 1)
                : rows;
            const vocabularyHtml = contentRows
                .map((cells) => cells[vocabularyIndex] ?? "")
                .join("\n\n");
            const materialsHtml = contentRows
                .map((cells) => cells[materialsIndex] ?? "")
                .join("\n\n");

            return `
                <section class="portal-wp-support-section">
                    <h2>Bright Ideas</h2>
                    <div class="portal-wp-support-grid">
                        <div class="portal-wp-support-card">
                            <h3>Vocabulary</h3>
                            ${renderSupportList(vocabularyHtml)}
                        </div>
                        <div class="portal-wp-support-card">
                            <h3>Materials</h3>
                            ${renderSupportList(materialsHtml)}
                        </div>
                    </div>
                </section>
            `;
        },
    );
}

function renderLearningObjective(content: string) {
    const objectiveContent = cleanWordPressHtmlNesting(content).trim();

    if (getHtmlText(objectiveContent).length === 0) {
        return "";
    }

    const body = /<\/?(?:p|ul|ol|li|div|blockquote)\b/i.test(objectiveContent)
        ? objectiveContent
        : `<p>${objectiveContent}</p>`;

    return `
            <section class="portal-wp-learning-objective">
                <h2>Learning Objective</h2>
                <div class="portal-wp-learning-objective-body">
                    ${body}
                </div>
            </section>
        `;
}

function renderReflectionQuestion(content: string) {
    const questionContent = cleanWordPressHtmlNesting(content).trim();

    if (getHtmlText(questionContent).length === 0) {
        return "";
    }

    const body = /<\/?(?:p|ul|ol|li|div|blockquote)\b/i.test(questionContent)
        ? questionContent
        : `<p>${questionContent}</p>`;

    return `
            <section class="portal-wp-reflection">
                <h2>Reflection Question</h2>
                <div class="portal-wp-reflection-body">
                    ${body}
                </div>
            </section>
        `;
}

function renderCongratulations(content: string) {
    const congratulationsContent = cleanWordPressHtmlNesting(content).trim();

    if (getHtmlText(congratulationsContent).length === 0) {
        return "";
    }

    const body = /<\/?(?:p|ul|ol|li|div|blockquote)\b/i.test(congratulationsContent)
        ? congratulationsContent
        : `<p>${congratulationsContent}</p>`;

    return `
            <section class="portal-wp-congratulations">
                <h2>Congratulations!</h2>
                <div class="portal-wp-congratulations-body">
                    ${body}
                </div>
            </section>
        `;
}

function wrapBottomResourceSections(html: string) {
    return html
        .replace(
            /<h3>\s*(?:<(?:strong|b)>)?\s*BRIGHT IDEAS\s*(?:<\/(?:strong|b)>)?\s*<\/h3>\s*(?:<p>(?:\s|&nbsp;)*<\/p>\s*)?([\s\S]*?)<h3>\s*(?:KEY\s+)?VOCABULARY\s*<\/h3>\s*([\s\S]*?)(?=<div class="portal-wp-nav-row">|<a\b[^>]*portal-wp-button|$)/i,
            (_match, brightIdeas: string, vocabulary: string) =>
                renderSupportSection(brightIdeas, vocabulary),
        )
        .replace(
            /<h3>\s*(?:<(?:strong|b)>)?\s*BRIGHT IDEAS\s*(?:<\/(?:strong|b)>)?\s*<\/h3>\s*(?:<p>(?:\s|&nbsp;)*<\/p>\s*)?([\s\S]*?)(?=<div class="portal-wp-nav-row">|<a\b[^>]*portal-wp-button|$)/i,
            (_match, brightIdeas: string) => renderSupportSection(brightIdeas),
        );
}

function wrapMainContentSections(html: string) {
    return html.replace(
        /<h3>\s*(?!<(?:strong|b)>\s*BRIGHT IDEAS\s*<\/(?:strong|b)>)(?!BRIGHT IDEAS\b)([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h3>|<div class="portal-wp-nav-row">|<a\b[^>]*portal-wp-button|$)/gi,
        (_match, heading: string, content: string) => {
            if (getHtmlText(content).length === 0) {
                return `<h3>${heading}</h3>`;
            }

            return `
            <section class="portal-wp-content-section">
                <h3>${heading}</h3>
                <div class="portal-wp-content-section-body">
                    ${content}
                </div>
            </section>
        `;
        },
    );
}

function wrapMaterialsSection(html: string) {
    return html.replace(
        /<h2 class="portal-wp-tab-heading">\s*Materials\s*<\/h2>\s*([\s\S]*?)(?=<h2 class="portal-wp-tab-heading">|<h3>\s*(?:<(?:strong|b)>)?\s*BRIGHT IDEAS|<div class="portal-wp-nav-row">|<a\b[^>]*portal-wp-button|$)/gi,
        (_match, content: string) => {
            if (getHtmlText(content).length === 0) {
                return "";
            }

            return `
            <section class="portal-wp-content-section portal-wp-materials-section">
                <h2>Materials</h2>
                <div class="portal-wp-content-section-body">
                    ${content}
                </div>
            </section>
        `;
        },
    );
}

function parseCurriculumBook(html: string, pageTitle: string): CurriculumBook | null {
    const decodedHtml = normalizeWordPressContent(html);

    const titleMatch = decodedHtml.match(
        /(?:<strong>\s*)?([^<\n]*Curriculum Book)(?:\s*<\/strong>)?/i,
    );

    if (!titleMatch || !decodedHtml.includes("[nectar_horizontal_list_item")) {
        return null;
    }

    const curriculumTitle = titleMatch?.[1].trim() ?? pageTitle;

    const units: CurriculumUnit[] = [];
    let currentUnitTitle: string | null = null;
    const tokenRegex =
        /\[(ultimate_exp_section|nectar_horizontal_list_item)\b([^\]]*)\]/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(decodedHtml)) !== null) {
        const shortcodeName = match[1];
        const attributes = parseShortcodeAttributes(match[2]);

        if (shortcodeName === "ultimate_exp_section") {
            currentUnitTitle = attributes.title?.trim() || null;

            if (
                currentUnitTitle &&
                !units.some((unit) => unit.title === currentUnitTitle)
            ) {
                units.push({
                    title: currentUnitTitle,
                    lessons: [],
                });
            }

            continue;
        }

        const lessonTitle = attributes.col_1_content;
        const lessonHref = attributes.url;

        if (!lessonTitle || !lessonHref) {
            continue;
        }

        const unitTitle =
            getFallbackUnitTitle(lessonTitle, curriculumTitle) ??
            currentUnitTitle ??
            units.at(-1)?.title ??
            `Unit ${units.length + 1}`;
        let unit = units.find((currentUnit) => currentUnit.title === unitTitle);

        if (!unit) {
            unit = {
                title: unitTitle,
                lessons: [],
            };
            units.push(unit);
        }

        unit.lessons.push({
            title: lessonTitle,
            href: getPortalResourceHref(lessonHref),
        });
    }

    const populatedUnits = units.filter((unit) => unit.lessons.length > 0);

    if (populatedUnits.length === 0) {
        return null;
    }

    return {
        title: titleMatch?.[1].trim() ?? null,
        units: populatedUnits,
    };
}

function parseDocumentAccordion(html: string, pageTitle: string): CurriculumBook | null {
    const decodedHtml = normalizeWordPressContent(html);

    if (!decodedHtml.includes("[toggles") || !decodedHtml.includes("[toggle")) {
        return null;
    }

    const titleMatch = decodedHtml.match(
        /<h2\b[^>]*>[\s\S]*?LIA\s+Documents[\s\S]*?<\/h2>/i,
    );
    const units: CurriculumUnit[] = [];
    const toggleRegex = /\[toggle\b([^\]]*)\]([\s\S]*?)\[\/toggle\]/gi;
    let match: RegExpExecArray | null;

    while ((match = toggleRegex.exec(decodedHtml)) !== null) {
        const attributes = parseShortcodeAttributes(match[1]);
        const unitTitle = attributes.title?.trim();
        const content = match[2];

        if (!unitTitle) {
            continue;
        }

        const lessons: CurriculumUnit["lessons"] = [];
        const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
        let linkMatch: RegExpExecArray | null;

        while ((linkMatch = linkRegex.exec(content)) !== null) {
            const href = getAttributeValue(linkMatch[1], "href");
            const title = getHtmlText(linkMatch[2]);

            if (!title || !href) {
                continue;
            }

            lessons.push({
                title,
                href: getPortalResourceHref(href),
            });
        }

        if (lessons.length === 0) {
            const fallbackText = getHtmlText(
                content.replace(/\[(?:\/)?(?:vc_row_inner|vc_column_inner|vc_column_text)\b[^\]]*\]/g, ""),
            );

            if (fallbackText) {
                lessons.push({
                    title: fallbackText,
                    href: null,
                });
            }
        }

        units.push({
            title: unitTitle,
            lessons,
        });
    }

    const populatedUnits = units.filter((unit) => unit.lessons.length > 0);

    if (populatedUnits.length === 0) {
        return null;
    }

    return {
        title: titleMatch ? "LIA Documents" : pageTitle,
        units: populatedUnits,
    };
}

function prepareWordPressHtml(html: string, pageTitle: string) {
    const normalizedHtml = normalizeWordPressContent(html);
    const normalizedPageTitle = normalizeTitleForComparison(pageTitle);
    const portalLinkedHtml = removeDuplicateFirstHeading(
        preparePortalLinks(normalizedHtml),
        pageTitle,
    );
    let hasCheckedFirstHeading = false;

    return cleanWordPressHtmlNesting(wrapBottomResourceSections(wrapBrightIdeasTables(wrapMainContentSections(wrapMaterialsSection(portalLinkedHtml
        .replace(/\[vc_custom_heading\b([^\]]*)\]/g, (_match, shortcode: string) => {
            const attributes = parseShortcodeAttributes(shortcode);
            const headingText = attributes.text;

            if (!headingText) {
                return "";
            }

            if (!hasCheckedFirstHeading) {
                hasCheckedFirstHeading = true;

                if (normalizeTitleForComparison(headingText) === normalizedPageTitle) {
                    return "";
                }
            }

            return `<h2>${headingText}</h2>`;
        })
        .replace(
            /\[vc_column_text[^\]]*\]\s*(?:<p>\s*)?BRIGHT IDEAS(?:\s*<\/p>)?\s*\[\/vc_column_text\]/gi,
            "<h3>BRIGHT IDEAS</h3>",
        )
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
        .replace(/\[nectar_horizontal_list_item\b([^\]]*)\]/g, (_match, shortcode: string) => {
            const attributes = parseShortcodeAttributes(shortcode);
            const label = attributes.col_1_content || attributes.cta_1_text;
            const href = attributes.cta_1_url || attributes.url;

            if (!label || !href) {
                return "";
            }

            const portalHref = getPortalResourceHref(href);
            const target = shouldOpenInNewTab(portalHref)
                ? ' target="_blank" rel="noreferrer"'
                : "";

            return `<p><a href="${portalHref}"${target} class="portal-wp-resource-link">${label}</a></p>`;
        })
        .replace(/\[(?:\/)?(?:toggles|toggle|ultimate_modal)\b[^\]]*\]/g, "")
        .replace(/\[(?:\/)?(?:toggles|toggle|ultimate_modal)\]/g, "")
        .replace(
            /<p>\s*(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]+(?:[^\s<"]*)?)\s*<\/p>/g,
            (_match: string, url: string) => renderYouTubeEmbed(url),
        )
        .replace(
            /(^|>|\s)(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]+(?:[^\s<"]*)?)(?=\s|<|$)/g,
            (_match: string, prefix: string, url: string) =>
                `${prefix}${renderYouTubeEmbed(url)}`,
        )
        .replace(
            /\[(?:\/)?(?:vc_row|vc_column|vc_row_inner|vc_column_inner|vc_column_text|divider|tabbed_section|tab|ultimate_exp_section)\b[^\]]*\]/g,
            "",
        )
        .replace(/\[(?:\/)?(?:vc_row|vc_column|vc_row_inner|vc_column_inner|vc_column_text|divider|tabbed_section|tab|ultimate_exp_section)\]/g, "")
        .replace(
            /(?:<p\b[^>]*>\s*)?<(?:span|strong|b)\b[^>]*>\s*(?:KEY\s+)?VOCABULARY\s*<\/(?:span|strong|b)>\s*(?:<\/p>)?/gi,
            "<h3>VOCABULARY</h3>",
        )
        .replace(
            /<(p|h[2-4])\b[^>]*>\s*(?:<(?:span|strong|b)\b[^>]*>\s*)*(?:KEY\s+)?VOCABULARY\s*(?:<\/(?:span|strong|b)>\s*)*<\/\1>/gi,
            "<h3>VOCABULARY</h3>",
        )
        .replace(/<a\b[^>]*>\s*(?:<br\s*\/?>\s*)*<\/a>/gi, "")
        .replace(
            /<a\b[^>]*>\s*(?:←\s*)?(?:Return to Module \d+|Return to New Teacher Modules)\s*<\/a>/g,
            "",
        )
        .replace(/\n{3,}/g, "\n\n")
        .replace(
            /<a\b([^>]*)>(\s*(?:←\s*)?(?:Previous Lesson|Previous Module|Next Lesson|Next Module)(?:\s*→)?\s*)<\/a>/g,
            (_match, attributes: string, label: string) => {
                const navClass = /Next/.test(label)
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
        )
        .replace(
            /(?:<p>\s*)?(?:<strong>\s*)?Learning Objectives?(?:<\/strong>)?(?:\s*<br\s*\/?>\s*){0,2}(?:<\/p>\s*)?([\s\S]*?)(?=<h2\b|<h3\b|<section\b|<a\b[^>]*class="[^"]*portal-wp-button|<div class="portal-wp-nav-row"|$)/gi,
            (_match, objective: string) => renderLearningObjective(objective),
        )
        .replace(
            /(?:<p>\s*)?(?:<strong>\s*)?Congratulations!(?:<\/strong>)?(?:\s*<br\s*\/?>\s*){0,2}(?:<\/p>\s*)?([\s\S]*?)(?=<a\b[^>]*class="[^"]*portal-wp-button|<div class="portal-wp-nav-row"|$)/gi,
            (_match, content: string) => renderCongratulations(content),
        )
        .replace(
            /(?:<p>\s*)?(?:<strong>\s*)?Reflection Question(?:<\/strong>)?(?:\s*<br\s*\/?>\s*){0,2}(?:<\/p>\s*)?([\s\S]*?)(?=<section class="portal-wp-congratulations"|<a\b[^>]*class="[^"]*portal-wp-button|<div class="portal-wp-nav-row"|$)/gi,
            (_match, question: string) => renderReflectionQuestion(question),
        )
        .replace(
            /(<a\b[^>]*class="[^"]*portal-wp-button[^"]*portal-wp-button-previous[^"]*"[^>]*>\s*(?:←\s*)?Previous (?:Lesson|Module)\s*<\/a>)\s*(<a\b[^>]*class="[^"]*portal-wp-button[^"]*portal-wp-button-next[^"]*"[^>]*>\s*Next (?:Lesson|Module)(?:\s*→)?\s*<\/a>)/g,
            '<div class="portal-wp-nav-row">$1$2</div>',
        ))))));
}

export default async function WordPressResourcesPage({
    params,
}: WordPressResourcePageProps) {
    const { supabase, profile } = await requireTeacher();

    const { type, id } = await params;

    if (!isWordPressContentType(type)) {
        notFound();
    }

    if (id === "module-5-completion-quiz") {
        redirect("/teacher/modules/completion-quiz");
    }

    const importedPage = getImportedCurriculumPage(id);
    const wordpressPage = importedPage ? null : await getWordPressContent(type, id);

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

    if (profile.role === "teacher") {
        const { data: teacher, error: teacherError } = await supabase
            .from("teachers")
            .select("program_level")
            .eq("profile_id", profile.id)
            .maybeSingle();
        
        if (teacherError) {
            throw new Error(
                `Unable to verify curriculum access: ${teacherError.message}`,
            );
        }

        const canAccessPage = canViewCurriculumPage(
            teacher?.program_level,
            page.link,
        );

        if (!canAccessPage) {
            redirect("/teacher/resources");
        }
    }

    const curriculumBook =
        parseCurriculumBook(page.content.rendered, page.title.rendered) ??
        parseDocumentAccordion(page.content.rendered, page.title.rendered);
    
    const isLiaDocumentsPage =
        String(page.id) === "6769" ||
        page.slug === "lia-docs-2";

    if (isLiaDocumentsPage && curriculumBook) {
        const tutoringDocuments = curriculumBook.units.find(
            (unit) => unit.title === "Tutoring Documents",
        );

        const tutoringPreparationResource = {
            title: "Tutoring Preparation Presentation",
            href: "/resources/tutoring/tutoring-preparation",
        };

        if (tutoringDocuments) {
            const alreadyAdded = tutoringDocuments.lessons.some(
                (lesson) =>
                    lesson.href === tutoringPreparationResource.href,
            );

            if (!alreadyAdded) {
                tutoringDocuments.lessons.push(
                    tutoringPreparationResource,
                );
            }
        } else {
            curriculumBook.units.push({
                title: "Tutoring Documents",
                lessons: [tutoringPreparationResource],
            });
        }
    }
    const backLink = getBackToCurriculumLink(page.link, page.content.rendered);
    const currentPageHrefs = [
        `/teacher/resources/page/${page.id}`,
        `/teacher/resources/page/${page.slug}`,
    ];
    const backHref = currentPageHrefs.includes(backLink.href)
        ? "/teacher/resources"
        : backLink.href;
    const backLabel = backHref === "/teacher/resources"
        ? "Back to curriculum"
        : backLink.label;

    return (
        <div className="mx-auto max-w-5xl">
            <Link
                href={backHref}
                className="inline-flex rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c4122f] shadow-sm transition hover:bg-red-50 hover:text-[#a70d25]"
            >
                {backLabel}
            </Link>

            <article className="mt-6 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-8">
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
                                    {unit.lessons.map((lesson) =>
                                        lesson.href ? (
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
                                        ) : (
                                            <p
                                                key={`${unit.title}-${lesson.title}`}
                                                className="px-1 py-4 text-base text-zinc-600"
                                            >
                                                {lesson.title}
                                            </p>
                                        ),
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                ) : (
                    <div
                        className="mt-8 max-w-none text-zinc-700 [&_.elementor-button-link]:inline-flex [&_.elementor-button-link]:rounded-md [&_.elementor-button-link]:bg-[#c4122f] [&_.elementor-button-link]:px-4 [&_.elementor-button-link]:py-2 [&_.elementor-button-link]:text-sm [&_.elementor-button-link]:font-semibold [&_.elementor-button-link]:text-white [&_.elementor-button-link:hover]:bg-[#a70d25] [&_.elementor-button]:text-white [&_.elementor-widget-button_a]:inline-flex [&_.portal-wp-button-next]:ml-auto [&_.portal-wp-button-next]:flex [&_.portal-wp-button-next]:w-fit [&_.portal-wp-button-previous]:flex [&_.portal-wp-button-previous]:w-fit [&_.portal-wp-button]:rounded-md [&_.portal-wp-button]:border [&_.portal-wp-button]:border-red-200 [&_.portal-wp-button]:bg-white [&_.portal-wp-button]:px-4 [&_.portal-wp-button]:py-2 [&_.portal-wp-button]:text-sm [&_.portal-wp-button]:font-semibold [&_.portal-wp-button]:text-[#c4122f] [&_.portal-wp-button:hover]:bg-red-50 [&_.portal-wp-nav-row]:mt-10 [&_.portal-wp-nav-row]:flex [&_.portal-wp-nav-row]:items-center [&_.portal-wp-nav-row]:justify-between [&_.portal-wp-nav-row]:gap-4 [&_.portal-wp-nav-row]:border-t [&_.portal-wp-nav-row]:border-red-100 [&_.portal-wp-nav-row]:pt-6 [&_.portal-wp-video]:my-6 [&_.portal-wp-video]:aspect-video [&_.portal-wp-video]:w-full [&_.portal-wp-video]:overflow-hidden [&_.portal-wp-video]:rounded-md [&_.portal-wp-video]:bg-zinc-950 [&_.portal-wp-video_iframe]:h-full [&_.portal-wp-video_iframe]:w-full [&_.portal-wp-learning-objective]:my-8 [&_.portal-wp-learning-objective]:rounded-md [&_.portal-wp-learning-objective]:border-l-4 [&_.portal-wp-learning-objective]:border-[#c4122f] [&_.portal-wp-learning-objective]:bg-zinc-50 [&_.portal-wp-learning-objective]:p-5 [&_.portal-wp-learning-objective_h2]:mb-2 [&_.portal-wp-learning-objective_h2]:mt-0 [&_.portal-wp-learning-objective_h2]:text-base [&_.portal-wp-learning-objective_h2]:font-semibold [&_.portal-wp-learning-objective_h2]:text-zinc-800 [&_.portal-wp-learning-objective_p]:my-0 [&_.portal-wp-learning-objective_p]:leading-8 [&_.portal-wp-reflection]:my-8 [&_.portal-wp-reflection]:rounded-md [&_.portal-wp-reflection]:border [&_.portal-wp-reflection]:border-red-300 [&_.portal-wp-reflection]:bg-red-50/40 [&_.portal-wp-reflection]:p-5 [&_.portal-wp-reflection_h2]:mb-3 [&_.portal-wp-reflection_h2]:mt-0 [&_.portal-wp-reflection_h2]:text-base [&_.portal-wp-reflection_h2]:font-semibold [&_.portal-wp-reflection_h2]:text-zinc-800 [&_.portal-wp-reflection_p]:my-0 [&_.portal-wp-reflection_p]:leading-8 [&_.portal-wp-congratulations]:my-8 [&_.portal-wp-congratulations]:rounded-md [&_.portal-wp-congratulations]:border-l-4 [&_.portal-wp-congratulations]:border-green-600 [&_.portal-wp-congratulations]:bg-green-50 [&_.portal-wp-congratulations]:p-5 [&_.portal-wp-congratulations_h2]:mb-3 [&_.portal-wp-congratulations_h2]:mt-0 [&_.portal-wp-congratulations_h2]:text-base [&_.portal-wp-congratulations_h2]:font-semibold [&_.portal-wp-congratulations_h2]:text-zinc-800 [&_.portal-wp-congratulations_p]:my-0 [&_.portal-wp-congratulations_p]:leading-8 [&_.portal-wp-resource-link]:inline-flex [&_.portal-wp-resource-link]:rounded-md [&_.portal-wp-resource-link]:border [&_.portal-wp-resource-link]:border-red-100 [&_.portal-wp-resource-link]:bg-red-50 [&_.portal-wp-resource-link]:px-3 [&_.portal-wp-resource-link]:py-1.5 [&_.portal-wp-resource-link]:text-sm [&_.portal-wp-resource-link:hover]:bg-red-100 [&_.portal-wp-content-section-body]:rounded-md [&_.portal-wp-content-section-body]:border [&_.portal-wp-content-section-body]:border-zinc-200 [&_.portal-wp-content-section-body]:bg-white [&_.portal-wp-content-section-body]:p-4 [&_.portal-wp-content-section-body]:shadow-sm [&_.portal-wp-content-section>h2]:mb-3 [&_.portal-wp-content-section>h2]:mt-0 [&_.portal-wp-content-section>h2]:text-2xl [&_.portal-wp-content-section>h2]:font-semibold [&_.portal-wp-content-section>h2]:text-zinc-900 [&_.portal-wp-content-section>h3]:mb-3 [&_.portal-wp-content-section>h3]:mt-0 [&_.portal-wp-content-section>h3]:text-2xl [&_.portal-wp-content-section>h3]:font-semibold [&_.portal-wp-content-section>h3]:text-zinc-900 [&_.portal-wp-content-section]:my-6 [&_.portal-wp-content-section]:rounded-md [&_.portal-wp-content-section]:border [&_.portal-wp-content-section]:border-zinc-200 [&_.portal-wp-content-section]:bg-zinc-50 [&_.portal-wp-content-section]:p-5 [&_.portal-wp-content-section]:shadow-sm [&_.portal-wp-support-card_a]:mb-2 [&_.portal-wp-support-card_a]:mr-2 [&_.portal-wp-support-card_a]:inline-flex [&_.portal-wp-support-card_a]:rounded-md [&_.portal-wp-support-card_a]:border [&_.portal-wp-support-card_a]:border-red-100 [&_.portal-wp-support-card_a]:bg-red-50 [&_.portal-wp-support-card_a]:px-2.5 [&_.portal-wp-support-card_a]:py-1 [&_.portal-wp-support-card_a]:text-sm [&_.portal-wp-support-card_a:hover]:bg-red-100 [&_.portal-wp-support-card_br]:hidden [&_.portal-wp-support-card_h3]:mt-0 [&_.portal-wp-support-card_h3]:text-base [&_.portal-wp-support-card_h3]:font-semibold [&_.portal-wp-support-card_h3]:uppercase [&_.portal-wp-support-card_h3]:tracking-wide [&_.portal-wp-support-card_h3]:text-zinc-600 [&_.portal-wp-support-card_p]:my-3 [&_.portal-wp-support-card_p]:leading-7 [&_.portal-wp-support-card_table]:mb-0 [&_.portal-wp-support-card_table]:mt-3 [&_.portal-wp-support-card_ul]:mb-0 [&_.portal-wp-support-card_ul]:mt-3 [&_.portal-wp-support-card_ul]:pl-5 [&_.portal-wp-support-card]:rounded-md [&_.portal-wp-support-card]:border [&_.portal-wp-support-card]:border-zinc-200 [&_.portal-wp-support-card]:bg-white [&_.portal-wp-support-card]:p-4 [&_.portal-wp-support-card]:shadow-sm [&_.portal-wp-support-grid-single]:md:grid-cols-1 [&_.portal-wp-support-grid]:grid [&_.portal-wp-support-grid]:gap-4 [&_.portal-wp-support-grid]:md:grid-cols-2 [&_.portal-wp-support-section_h2]:mb-3 [&_.portal-wp-support-section_h2]:mt-0 [&_.portal-wp-support-section_h2]:text-2xl [&_.portal-wp-support-section_h2]:font-semibold [&_.portal-wp-support-section_h2]:text-zinc-900 [&_.portal-wp-support-section]:mt-10 [&_.portal-wp-support-section]:rounded-md [&_.portal-wp-support-section]:border [&_.portal-wp-support-section]:border-zinc-200 [&_.portal-wp-support-section]:bg-zinc-50 [&_.portal-wp-support-section]:p-5 [&_.portal-wp-support-section]:shadow-sm [&_a:hover]:text-[#a70d25] [&_a]:font-semibold [&_a]:text-[#c4122f] [&_figure]:mx-auto [&_figure]:my-6 [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-zinc-900 [&_img]:mx-auto [&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-2 [&_li]:leading-7 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p]:text-base [&_p]:leading-8 [&_strong]:font-semibold [&_table]:my-4 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:border-zinc-200 [&_table]:bg-zinc-50 [&_td]:border-t [&_td]:border-zinc-100 [&_td]:bg-zinc-50 [&_td]:p-4 [&_td]:align-top [&_td]:leading-7 [&_td:first-child]:w-1/3 [&_td:first-child]:font-medium [&_td_a]:mb-2 [&_td_a]:mr-2 [&_td_a]:inline-flex [&_td_a]:rounded-md [&_td_a]:border [&_td_a]:border-red-100 [&_td_a]:bg-red-50 [&_td_a]:px-2.5 [&_td_a]:py-1 [&_td_a]:text-sm [&_td_a:hover]:bg-red-100 [&_tr:first-child_td]:border-t-0 [&_tr:first-child_td]:bg-zinc-100 [&_tr:first-child_td]:font-semibold [&_tr:first-child_td]:text-zinc-800 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_.wp-caption]:mx-auto"
                        dangerouslySetInnerHTML={{
                            __html: prepareWordPressHtml(
                                page.content.rendered,
                                page.title.rendered,
                            ),
                        }}
                    />
                )}
            </article>
        </div>
    );
}

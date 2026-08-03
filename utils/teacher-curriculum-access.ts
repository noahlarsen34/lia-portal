export type TeacherProgramLevel =
    | "elementary"
    | "middle"
    | "high"
    | "middle_high"
    | "k_8"
    | "k_12"
    | "other";

export type CurriculumSectionKey = 
    | "elementary"
    | "middle-school"
    | "high-school"
    | "lia-docs"
    | "by-teachers"
    | "video-library";

const universalSections = new Set<CurriculumSectionKey>([
    "lia-docs",
    "by-teachers",
    "video-library",
]);

const gradeSectionsByProgramLevel: Record<
    TeacherProgramLevel,
    CurriculumSectionKey[]
> = {
    elementary: ["elementary"],
    middle: ["middle-school"],
    high: ["high-school"],
    middle_high: ["middle-school", "high-school"],
    k_8: ["elementary", "middle-school"],
    k_12: ["elementary", "middle-school", "high-school"],
    other: [],
};

function normalizeProgramLevel(
    programLevel: string | null | undefined,
): TeacherProgramLevel | null {
    const normalized = programLevel?.trim().toLowerCase();

    if (
        normalized === "elementary" ||
        normalized === "middle" ||
        normalized === "high" ||
        normalized === "middle_high" ||
        normalized === "k_8" ||
        normalized === "k_12" ||
        normalized === "other" 
    ) {
        return normalized;
    }

    return null;
}

export function canViewCurriculumSection(
    programLevel: string | null | undefined,
    sectionKey: CurriculumSectionKey,
) {
    if (universalSections.has(sectionKey)) {
        return true;
    }

    const normalizedLevel = normalizeProgramLevel(programLevel);

    if (!normalizedLevel) {
        return false;
    }

    return gradeSectionsByProgramLevel[normalizedLevel].includes(sectionKey);
}

function getCurriculumSectionFromPageLink(
    pageLink: string,
) : CurriculumSectionKey | null {
    const normalizedLink = pageLink.toLowerCase();

    if (/\/lia-elementary(?:\/|$)/.test(normalizedLink)) {
        return "elementary";
    }

    if (/\/lia-middle-school(?:\/|$)/.test(normalizedLink)) {
        return "middle-school";
    }

    if (/\/high-school(?:\/|$)/.test(normalizedLink)) {
        return "high-school";
    }

    if (/\/lia-docs-2(?:\/|$)/.test(normalizedLink)) {
        return "lia-docs";
    }

    if (/\/created-by-teachers(?:\/|$)/.test(normalizedLink)) {
        return "by-teachers";
    }

    return null;
}

export function canViewCurriculumPage(
    programLevel: string | null | undefined,
    pageLink: string,
) {
    const sectionKey = getCurriculumSectionFromPageLink(pageLink);

    if (!sectionKey) {
        return true;
    }

    return canViewCurriculumSection(programLevel, sectionKey);
}

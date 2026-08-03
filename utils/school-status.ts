export const CURRENT_LIA_SCHOOL_YEAR = "2026-2027";

export type SchoolLifeCycleStatus =
    | "new"
    | "returning"
    | "unknown";

function normalizeSchoolYear(
    year: string | number | null | undefined,
) {
    return String(year ?? "")
        .trim()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, "");
}

export function getSchoolLifeCycleStatus(
    yearLiaStarted: string | number | null | undefined,
) : SchoolLifeCycleStatus {
    const normalizedYear = normalizeSchoolYear(yearLiaStarted);

    if (!normalizedYear) {
        return "unknown";
    }

    if (normalizedYear === CURRENT_LIA_SCHOOL_YEAR) {
        return "new";
    }

    return "returning";
}

export function getSchoolLifeCycleLabel(
    status: SchoolLifeCycleStatus,
) {
     switch (status) {
        case "new":
            return "New School";
        case "returning":
            return "Returning School";
        default:
            return "Unknown";
    }
}
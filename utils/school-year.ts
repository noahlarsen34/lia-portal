const SCHOOL_YEAR_PATTERN = /^(\d{2}|\d{4})[-/](\d{2}|\d{4})$/;

function expandYear(value: string, referenceYear?: number) {
    const year = Number(value);

    if (value.length === 4) {
        return year;
    }

    if (referenceYear !== undefined) {
        let expanded = Math.floor(referenceYear / 100) * 100 + year;

        if (expanded < referenceYear) {
            expanded += 100;
        }

        return expanded;
    }

    return 2000 + year;
}

export function normalizeSchoolYear(value: string) {
    const compactValue = value
        .trim()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, "");
    const match = compactValue.match(SCHOOL_YEAR_PATTERN);

    if (!match) {
        return value.trim();
    }

    const startYear = expandYear(match[1]);
    const endYear = expandYear(match[2], startYear);

    return `${startYear}-${endYear}`;
}

export function formatSchoolYear(value: string) {
    return normalizeSchoolYear(value).replace(/^(\d{4})-(\d{4})$/, "$1–$2");
}

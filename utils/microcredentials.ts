export const MICROCredential_OPTIONS = [
    { value: "leadership", label: "Leadership "},
    { value: "service", label: "Service" },
    { value: "professionalism", label: "Professionalism" },
    { value: "academic-excellence", label: "Academic Excellence" },
    { value: "other", label: "Other" },
] as const;

export const ALLOWED_MICROCREDENTIAL_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
];

export const MAX_MICROCREDENTIAL_FILE_SIZE = 10 * 1024 * 1024;

export function isValidMicrocredential(value: string) {
    return MICROCredential_OPTIONS.some((option) => option.value === value);
}
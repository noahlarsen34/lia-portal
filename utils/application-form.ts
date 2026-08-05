export type ApplicationQuestionType =
    | "short_text"
    | "long_text"
    | "number"
    | "multiple_choice"
    | "yes_no"
    | "file_upload";

export const APPLICATION_RECOMMENDATION_BUCKET =
    "application-recommendations";

export const MAX_APPLICATION_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_APPLICATION_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
] as const;

export type ApplicationFileAnswer = {
    kind: "file";
    bucket: string;
    path: string;
    originalName: string;
    contentType: string;
    size: number;
};

export function isApplicationFileAnswer(
    value: unknown,
): value is ApplicationFileAnswer {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const answer = value as Record<string, unknown>;

    return (
        answer.kind === "file" &&
        typeof answer.bucket === "string" &&
        typeof answer.path === "string" &&
        typeof answer.originalName === "string" &&
        typeof answer.contentType === "string" &&
        typeof answer.size === "number"
    );
}

export type ApplicationQuestion = {
    id: string;
    question_key: string;
    label_en: string;
    label_es: string | null;
    question_type: ApplicationQuestionType;
    required: boolean;
    options: string[];
    position: number;
    is_locked: boolean;
};

export const lockedApplicationQuestions =[
    {
        question_key: "first_name",
        label_en: "First name",
        label_es: "Nombre",
        question_type: "short_text",
        required: true,
    },
    {
        question_key: "last_name",
        label_en: "Last name",
        label_es: "Appellido",
        question_type: "short_text",
        required: true,
    },
    {
        question_key: "email",
        label_en: "School email",
        label_es: "Correo electrónico escolar",
        question_type: "short_text",
        required: false,
    },
    {
        question_key: "grade_level",
        label_en: "Grade level",
        label_es: "Grado escolar",
        question_type: "short_text",
        required: false,
    },
    {
        question_key: "gpa",
        label_en: "GPA",
        label_es: "Promedio académico (GPA)",
        question_type: "number",
        required: true,
    },
] as const

export function questionInputName(questionId: string) {
    return `question_${questionId}`;
}

export function parseQuestionOptions(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((option): option is string => typeof option === "string")
        : [];
}

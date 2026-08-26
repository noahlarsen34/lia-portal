import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "microcredential-submissions";
const ASSIGNMENT_KEY = "intermountain-emotional-wellbeing";
const ASSIGNMENT_NAME =
    "Intermountain Health: Emotional Well-Being Training";
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const DOCUMENT_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
]);

const VIDEO_TYPES = new Set([
    "video/mp4",
    "video/quicktime",
    "video/webm",
]);

type RequestBody = {
    action?: unknown;
    enrollmentId?: unknown;
    fileName?: unknown;
    fileType?: unknown;
    fileSize?: unknown;
    filePath?: unknown;
    responses?: unknown;
};

type AssignmentResponses = {
    emotionalWellbeing: string;
    threeSteps: string;
    healthyStrategy: string;
    helpingSomeone: string;
    suggestions: string;
};

function stringValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function safeFileName(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "evidence";
}

function errorResponse(message: string, status = 400) {
    return Response.json({ error: message }, { status });
}

function parseResponses(value: unknown): AssignmentResponses | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const responses = {
        emotionalWellbeing: stringValue(record.emotionalWellbeing),
        threeSteps: stringValue(record.threeSteps),
        healthyStrategy: stringValue(record.healthyStrategy),
        helpingSomeone: stringValue(record.helpingSomeone),
        suggestions: stringValue(record.suggestions),
    };

    const required = [
        responses.emotionalWellbeing,
        responses.threeSteps,
        responses.healthyStrategy,
        responses.helpingSomeone,
    ];

    if (
        required.some((answer) => answer.length < 10) ||
        Object.values(responses).some((answer) => answer.length > 5000)
    ) {
        return null;
    }

    return responses;
}

async function getClassAndEnrollment(
    token: string,
    enrollmentId: string,
) {
    const admin = createAdminClient();

    const { data: liaClass } = await admin
        .from("lia_classes")
        .select("id")
        .eq("application_token", token)
        .eq("status", "active")
        .maybeSingle();

    if (!liaClass) {
        return null;
    }

    const { data: enrollment } = await admin
        .from("lia_class_students")
        .select("id, students(first_name, last_name)")
        .eq("id", enrollmentId)
        .eq("lia_class_id", liaClass.id)
        .or("status.is.null,status.neq.removed")
        .maybeSingle();

    if (!enrollment) {
        return null;
    }

    const student = Array.isArray(enrollment.students)
        ? enrollment.students[0]
        : enrollment.students;

    return {
        admin,
        liaClass,
        enrollment,
        studentName: [student?.first_name, student?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim(),
    };
}

async function hasActiveSubmission(
    classId: string,
    enrollmentId: string,
) {
    const admin = createAdminClient();
    const { data } = await admin
        .from("microcredential_submissions")
        .select("id")
        .eq("lia_class_id", classId)
        .eq("student_enrollment_id", enrollmentId)
        .eq("assignment_key", ASSIGNMENT_KEY)
        .in("status", ["pending", "approved"])
        .limit(1)
        .maybeSingle();

    return Boolean(data);
}

export async function POST(
    request: Request,
    context: { params: Promise<{ token: string }> },
) {
    const { token } = await context.params;

    let body: RequestBody;

    try {
        body = (await request.json()) as RequestBody;
    } catch {
        return errorResponse("The request could not be read.");
    }

    const enrollmentId = stringValue(body.enrollmentId);

    if (!enrollmentId) {
        return errorResponse("Select your name from the class roster.");
    }

    const contextData = await getClassAndEnrollment(
        token,
        enrollmentId,
    );

    if (!contextData) {
        return errorResponse("The selected student could not be verified.");
    }

    const { admin, liaClass, enrollment, studentName } = contextData;

    if (await hasActiveSubmission(liaClass.id, enrollment.id)) {
        return errorResponse(
            "This assignment has already been submitted and is awaiting review.",
            409,
        );
    }

    if (body.action === "prepare") {
        const fileName = stringValue(body.fileName);
        const fileType = stringValue(body.fileType);
        const fileSize = Number(body.fileSize);

        if (
            !fileName ||
            !Number.isFinite(fileSize) ||
            fileSize < 1 ||
            fileSize > MAX_FILE_SIZE ||
            (!DOCUMENT_TYPES.has(fileType) && !VIDEO_TYPES.has(fileType))
        ) {
            return errorResponse(
                "Upload a supported document or video no larger than 100 MB.",
            );
        }

        const filePath = [
            liaClass.id,
            enrollment.id,
            ASSIGNMENT_KEY,
            `${crypto.randomUUID()}-${safeFileName(fileName)}`,
        ].join("/");

        const { data, error } = await admin.storage
            .from(BUCKET)
            .createSignedUploadUrl(filePath);

        if (error || !data) {
            console.error("Intermountain signed upload creation failed", {
                classId: liaClass.id,
                enrollmentId,
                message: error?.message,
            });

            return errorResponse("The upload could not be started.", 500);
        }

        return Response.json({
            filePath,
            token: data.token,
        });
    }

    if (body.action === "complete") {
        const fileName = stringValue(body.fileName);
        const fileType = stringValue(body.fileType);
        const filePath = stringValue(body.filePath);
        const fileSize = Number(body.fileSize);
        const responses = parseResponses(body.responses);
        const expectedPrefix =
            `${liaClass.id}/${enrollment.id}/${ASSIGNMENT_KEY}/`;

        if (
            !responses ||
            !fileName ||
            !filePath.startsWith(expectedPrefix) ||
            !Number.isFinite(fileSize) ||
            fileSize < 1 ||
            fileSize > MAX_FILE_SIZE ||
            (!DOCUMENT_TYPES.has(fileType) && !VIDEO_TYPES.has(fileType))
        ) {
            return errorResponse("The completed assignment is invalid.");
        }

        const evidenceKind = VIDEO_TYPES.has(fileType)
            ? "video"
            : "document";

        const { error } = await admin
            .from("microcredential_submissions")
            .insert({
                lia_class_id: liaClass.id,
                student_enrollment_id: enrollment.id,
                student_name_snapshot: studentName,
                credential_type: ASSIGNMENT_NAME,
                assignment_key: ASSIGNMENT_KEY,
                responses,
                evidence_kind: evidenceKind,
                file_path: filePath,
                original_file_name: fileName,
                mime_type: fileType,
                file_size_bytes: fileSize,
                student_note: responses.suggestions || null,
                status: "pending",
            });

        if (error) {
            await admin.storage.from(BUCKET).remove([filePath]);

            console.error("Intermountain submission insert failed", {
                classId: liaClass.id,
                enrollmentId,
                message: error.message,
            });

            return errorResponse("The assignment could not be saved.", 500);
        }

        return Response.json({ success: true });
    }

    return errorResponse("Unknown submission action.");
}

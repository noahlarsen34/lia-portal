"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";

const TUTORING_PROOF_BUCKET = "tutoring-log-proof";
const MAX_PROOF_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_PROOF_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getString(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function getDurationMinutes(arrivalTime: string, departureTime: string) {
    const [arrivalHours, arrivalMinutes] = arrivalTime.split(":").map(Number);
    const [departureHours, departureMinutes] =
        departureTime.split(":").map(Number);

    if (
        Number.isNaN(arrivalHours) ||
        Number.isNaN(arrivalMinutes) ||
        Number.isNaN(departureHours) ||
        Number.isNaN(departureMinutes)
    ) {
        return 0;
    }

    const arrivalTotal = arrivalHours * 60 + arrivalMinutes;
    const departureTotal = departureHours * 60 + departureMinutes;

    return departureTotal - arrivalTotal;
}

function cleanFileName(fileName: string) {
    return fileName
        .normalize("NFKD")
        .replace(/[^\w.\-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
        .slice(0, 180);
}

export async function submitTutoringLog(
    token: string,
    formData: FormData,
) {
    // Submissions come from unsigned-in students, so all token and enrollment
    // checks must use the server-only client. The UUID token and the enrollment
    // class match below remain the authorization boundary.
    const admin = createAdminClient();

    const { data: liaClass } = await admin
        .from("lia_classes")
        .select("id")
        .eq("application_token", token)
        .maybeSingle();

    if (!liaClass) {
        redirect(`/tutoring/${token}?error=class-not-found`);
    }

    const studentEnrollmentId = getString(
        formData,
        "studentEnrollmentId",
    );
    const activityType = getString(formData, "activityType");
    const sessionDate = getString(formData, "sessionDate");
    const arrivalTime = getString(formData, "arrivalTime");
    const departureTime = getString(formData, "departureTime");

    if (!studentEnrollmentId) {
        redirect(`/tutoring/${token}?error=missing-student`);
    }

    const durationMinutes = getDurationMinutes(
        arrivalTime,
        departureTime,
    );

    if (!durationMinutes || durationMinutes <= 0) {
        redirect(`/tutoring/${token}?error=invalid-time`);
    }

    const proofFileValue = formData.get("proofFile");

    if (
        !(proofFileValue instanceof File) ||
        proofFileValue.size === 0
    ) {
        redirect(`/tutoring/${token}?error=missing-proof`);
    }

    const proofFile = proofFileValue;

    if (proofFile.size > MAX_PROOF_FILE_SIZE) {
        redirect(`/tutoring/${token}?error=proof-too-large`);
    }

    if (!ALLOWED_PROOF_TYPES.has(proofFile.type)) {
        redirect(`/tutoring/${token}?error=invalid-proof-type`);
    }

    const { data: enrollment } = await admin
        .from("lia_class_students")
        .select(
            `
                id,
                lia_class_id,
                students (
                    first_name,
                    last_name
                )
            `,
        )
        .eq("id", studentEnrollmentId)
        .eq("lia_class_id", liaClass.id)
        .maybeSingle();

    if (!enrollment) {
        redirect(`/tutoring/${token}?error=missing-student`);
    }

    const student = Array.isArray(enrollment.students)
        ? enrollment.students[0]
        : enrollment.students;

    const studentName =
        `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim();

    const logId = crypto.randomUUID();
    const safeFileName =
        cleanFileName(proofFile.name) || "tutoring-proof";

    const proofFilePath = [
        liaClass.id,
        studentEnrollmentId,
        logId,
        `${crypto.randomUUID()}-${safeFileName}`,
    ].join("/");

    const { error: uploadError } = await admin.storage
        .from(TUTORING_PROOF_BUCKET)
        .upload(proofFilePath, proofFile, {
            cacheControl: "3600",
            contentType: proofFile.type,
            upsert: false,
        });

    if (uploadError) {
        console.error("Tutoring proof upload failed", {
            bucket: TUTORING_PROOF_BUCKET,
            filePath: proofFilePath,
            contentType: proofFile.type,
            fileSize: proofFile.size,
            message: uploadError.message,
        });

        redirect(`/tutoring/${token}?error=proof-upload-failed`);
    }

    const { error: insertError } = await admin
        .from("tutoring_logs")
        .insert({
            id: logId,
            lia_class_id: liaClass.id,
            student_enrollment_id: studentEnrollmentId,

            student_name_snapshot: studentName,
            school_site:
                getString(formData, "schoolSite") || null,
            class_period:
                getString(formData, "classPeriod") || null,

            activity_type:
                activityType === "service"
                    ? "service"
                    : "tutoring",
            session_date: sessionDate,

            arrival_time: arrivalTime,
            departure_time: departureTime,
            duration_minutes: durationMinutes,

            mentor_initials:
                getString(formData, "mentorInitials") || null,
            major_activities:
                getString(formData, "majorActivities") || null,
            comments:
                getString(formData, "comments") || null,

            elementary_mentee_name:
                getString(formData, "elementaryMenteeName") || null,
            mentee_grade:
                getString(formData, "menteeGrade") || null,
            english_language_proficiency:
                getString(
                    formData,
                    "englishLanguageProficiency",
                ) || null,
            cooperating_elementary_teacher:
                getString(
                    formData,
                    "cooperatingElementaryTeacher",
                ) || null,

            proof_file_path: proofFilePath,
            proof_file_name: proofFile.name.slice(0, 255),
            proof_content_type: proofFile.type,
            proof_file_size: proofFile.size,

            status: "pending",
        });

    if (insertError) {
        console.error("Tutoring log insert failed", {
            classId: liaClass.id,
            enrollmentId: studentEnrollmentId,
            message: insertError.message,
        });

        await admin.storage
            .from(TUTORING_PROOF_BUCKET)
            .remove([proofFilePath]);

        redirect(`/tutoring/${token}?error=submission-failed`);
    }

    redirect(`/tutoring/${token}?submitted=true`);
}

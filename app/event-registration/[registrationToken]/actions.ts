"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { error } from "console";
import { last } from "pdf-lib";

const UPLOAD_BUCKET = 'event-registration-entries';
const MAX_TOTAL_UPLOAD_SIZE = 9 * 1024 * 1024;
const MAX_FILE_COUNT = 5;

const ALLOWED_FILE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "video/mp4",
    "video/quicktime",
]);

function textValue(formData: FormData, name: string) {
    const value = formData.get(name);

    return typeof value === "string" ? value.trim() : "";
}

function errorRedirect(
    registrationToken: string,
    error: string,
): never {
    redirect(
        `event-registration/${registrationToken}?error=${encodeURIComponent(error)}`,
    );
}

function sanitizeFileName(fileName: string) {
    return fileName
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

}

function isValidExternalUrl(value: string) {
    if (!value) {
        return true;
    }

    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

export async function submitEventRegistration(
    registrationToken: string,
    formData: FormData,
) {
    const supabase = createAdminClient();

    const firstName = textValue(formData, "first_name");
    const lastName = textValue(formData, "last_name");
    const studentEmail = textValue(formData, "student_email");
    const phone = textValue(formData, "phone");
    const gradeLevel = textValue(formData, "grade_level");

    const schoolId = textValue(formData, "school_id");
    const teacherId = textValue(formData, "teacher_id");
    const classId = textValue(formData, "lia_class_id");

    const competitionCategory = textValue(formData, "competition_category");

    const entryTitle = textValue(formData, "last_name");
    const writtenResponse = textValue(formData, "written_response");
    const externalUrl = textValue(formData, "external_url");

    const files = formData
        .getAll("entry_files")
        .filter(
            (value): value is File =>
                value instanceof File && value.size > 0,
        );
    
    if (
        !firstName ||
        !lastName ||
        !studentEmail ||
        !schoolId ||
        !teacherId ||
        !competitionCategory ||
        !entryTitle
    ) {
        errorRedirect(
            registrationToken,
            "Please complete every required field.",
        );
    }

    if (!studentEmail.includes("@")) {
        errorRedirect(
            registrationToken,
            "Please enter a valid email address.",
        );
    }

    if (!isValidExternalUrl(externalUrl)) {
        errorRedirect(
            registrationToken,
            "The competition entry link must be a valid website URL.",
        );
    }

    if (
        !writtenResponse &&
        !externalUrl &&
        files.length === 0
    ) {
        errorRedirect(
            registrationToken,
            "Please provide a written response, a website or video link, or at least one file.",
        );
    }

    if (files.length > MAX_FILE_COUNT) {
        errorRedirect(
            registrationToken,
            `You may upload to ${MAX_FILE_COUNT} files.`,
        );
    }

    const totalUploadSize = files.reduce(
        (total, file) => total + file.size,
        0,
    );

    if (totalUploadSize > MAX_TOTAL_UPLOAD_SIZE) {
        errorRedirect(
            registrationToken,
            "The combined upload size must be less than 9 MB. Upload larger videos to Google Drive or Youtube and paste the link insteaad.",
        );
    }

    const invalidFile = files.find(
        (file) => !ALLOWED_FILE_TYPES.has(file.type),
    );

    if (invalidFile) {
        errorRedirect(
            registrationToken,
            `"${invalidFile.name}" is not a support file type.`,
        );
    }

    const { data: event, error: eventError } = await supabase
        .from("lia_events")
        .select(
            `
                id,
                status,
                registration_deadline,
                all_schools 
            `,
        )
        .eq("registration_token", registrationToken)
        .maybeSingle();
    
    if (eventError || !event) {
        console.error("Event registration lookup failed", {
            registrationToken,
            message: eventError?.message,
        });

        errorRedirect(
            registrationToken,
            "This registration link is invalid or no longer available.",
        );
    }

    if (event.status !== "open") {
        errorRedirect(
            registrationToken,
            "Registration for this event is not currently open.",
        );
    }

    if (event.registration_deadline) {
        const deadline = new Date(
            `${event.registration_deadline}T23:59:59-06:00`,
        );

        if (Date.now() > deadline.getTime()) {
            errorRedirect(
                registrationToken,
                "The registration deadline for this event has passed.",
            );
        }
    }

    if (!event.all_schools) {
        const { data: eligibleSchool} = await supabase
            .from("lia_event_schools")
            .select("school_id")
            .eq("event_id", event.id)
            .eq("school_id", schoolId)
            .maybeSingle();
        
        if (!eligibleSchool) {
            errorRedirect(
                registrationToken,
                "The selected schools is not eligible for this event.",
            );
        }
    }

    const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("id, profile_id, school_id")
        .eq("id", teacherId)
        .eq("school_id", schoolId)
        .maybeSingle();
    
    if (teacherError || !teacher) {
        errorRedirect(
            registrationToken,
            "The selected teeacher does not belong to the selected school.",
        );
    }

    if (classId) {
        if (!teacher.profile_id) {
            errorRedirect(
                registrationToken,
                "The selected teacher does not have an active portal profile.",
            );
        }

        const { data: selectedClass } = await supabase
            .from("lia_classes")
            .select("id")
            .eq("id", classId)
            .eq("school_id", schoolId)
            .eq("teacher_profile_id", teacher.profile_id)
            .maybeSingle();
        
        if (!selectedClass) {
            errorRedirect(
                registrationToken,
                "The selected class does not belong to that teacher and school.",
            );
        }
    }

    const { data: registration, error: registrationError } =
        await supabase
            .from("event_registrations")
            .insert({
                event_id: event.id,
                school_id: schoolId,
                teacher_id: teacherId,
                lia_class_id: classId || null,

                first_name: firstName,
                last_name: lastName,
                student_email: studentEmail,
                phone: phone || null,
                grade_level: gradeLevel || null,

                competition_category: competitionCategory,
                entry_title: entryTitle,
                written_response: writtenResponse || null,
                external_url: externalUrl || null,

                status: "submitted",
            })
            .select("id")
            .single();
        
        
    if (registrationError || !registration) {
        if (registrationError?.code === "23505") {
            errorRedirect(
                registrationToken,
                "A registration for this email address has already been submitted.",
            );
        }

        console.error("Event registration insert failed", {
            eventId: event.id,
            schoolId,
            teacherId,
            message: registrationError?.message,
            code: registrationError?.code,
        });

        errorRedirect(
            registrationToken,
            "Your registration could not be submitted. Please try again.",
        );
    }

    const uploadedPaths: string[] = [];

    try {
        const fileRows: Array<{
            registration_id: string;
            bucket_name: string;
            file_path: string;
            original_file_name: string;
            mime_type: string;
            file_size: number;
        }> = [];

        for (const file of files) {
            const safeFileName =
                sanitizeFileName(file.name) || "competition-entry";
            
            const filePath = [
                event.id,
                registration.id,
                `${crypto.randomUUID()}-${safeFileName}`,
            ].join("/");

            const fileBuffer = await file.arrayBuffer();

            const { error: uploadError } = await supabase.storage
                .from(UPLOAD_BUCKET)
                .upload(filePath, fileBuffer, {
                    contentType: file.type,
                    upsert: false,
                });
            
            if (uploadError) {
                throw uploadError;
            }

            uploadedPaths.push(filePath);

            fileRows.push({
                registration_id: registration.id,
                bucket_name: UPLOAD_BUCKET,
                file_path: filePath,
                original_file_name: file.name,
                mime_type: file.type,
                file_size: file.size,
            });
        }

        if (fileRows.length > 0) {
            const { error: fileRecordError } = await supabase
                .from("event_registration_files")
                .insert(fileRows);
            
            if (fileRecordError) {
                throw fileRecordError;
            }
        }
    } catch (uploadError) {
        console.error("Competition entry upload failed", {
            eventId: event.id,
            registrationId: registration.id,
            message:
                uploadError instanceof Error
                    ? uploadError.message
                    : String(uploadError),

        });

        if (uploadedPaths.length > 0) {
            await supabase.storage
                .from(UPLOAD_BUCKET)
                .remove(uploadedPaths);
        }
        
        await supabase.from("event_registrations")
        .delete()
        .eq("id", registration.id);

        errorRedirect(
            registrationToken,
            "Your competition files could not be uploaded. Please try again.",
        )
    }

    redirect(
        `/event-registration/${registrationToken}?submitted=true`,
    );
}

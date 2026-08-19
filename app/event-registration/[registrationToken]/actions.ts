"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    escapeHtml,
    renderBrandedEmail,
    sendEmail,
} from "@/utils/email";

const UPLOAD_BUCKET = 'event-registration-entries';
const MAX_TOTAL_UPLOAD_SIZE = 9 * 1024 * 1024;
const MAX_FILE_COUNT = 5;
const COMPETITION_CATEGORIES = new Set([
    "Public speaking",
    "Art",
    "Video",
    "Essay",
]);

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
        `/event-registration/${registrationToken}?error=${encodeURIComponent(error)}`,
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

    let firstName = "";
    let lastName = "";
    let studentEmail = "";
    const phone = textValue(formData, "phone");
    let gradeLevel = "";

    const schoolId = textValue(formData, "school_id");
    const teacherId = textValue(formData, "teacher_id");
    const classId = textValue(formData, "lia_class_id");
    const studentEnrollmentId = textValue(
        formData,
        "student_enrollment_id",
    );

    const competitionCategory = textValue(formData, "competition_category");

    const entryTitle = textValue(formData, "entry_title");
    const externalUrl = textValue(formData, "external_url");

    const files = formData
        .getAll("entry_files")
        .filter(
            (value): value is File =>
                value instanceof File && value.size > 0,
        );
    
    if (
        !schoolId ||
        !teacherId ||
        !classId ||
        !studentEnrollmentId ||
        !competitionCategory ||
        !entryTitle
    ) {
        errorRedirect(
            registrationToken,
            "Please complete every required field.",
        );
    }

    if (!isValidExternalUrl(externalUrl)) {
        errorRedirect(
            registrationToken,
            "The competition entry link must be a valid website URL.",
        );
    }

    if (!COMPETITION_CATEGORIES.has(competitionCategory)) {
        errorRedirect(
            registrationToken,
            "Please select a valid competition category.",
        );
    }

    if (!externalUrl && files.length === 0) {
        errorRedirect(
            registrationToken,
            "Please upload at least one competition file or provide a shareable Google Doc, website, or video link.",
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
                name,
                description,
                event_date,
                start_time,
                end_time,
                location_name,
                address,
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

    const { data: enrollment, error: enrollmentError } = await supabase
        .from("lia_class_students")
        .select(
            "id, students(first_name, last_name, email, grade_level)",
        )
        .eq("id", studentEnrollmentId)
        .eq("lia_class_id", classId)
        .or("status.is.null,status.neq.removed")
        .maybeSingle();

    const relatedStudent = Array.isArray(enrollment?.students)
        ? enrollment.students[0]
        : enrollment?.students;

    if (enrollmentError || !enrollment || !relatedStudent) {
        errorRedirect(
            registrationToken,
            "The selected student is not currently enrolled in that class.",
        );
    }

    firstName = relatedStudent.first_name?.trim() || "";
    lastName = relatedStudent.last_name?.trim() || "";
    studentEmail = relatedStudent.email?.trim().toLowerCase() || "";
    gradeLevel = relatedStudent.grade_level?.trim() || "";

    if (!firstName || !lastName || !studentEmail.includes("@")) {
        errorRedirect(
            registrationToken,
            "Your roster record is missing a name or email address. Please ask your teacher to update it before registering.",
        );
    }

    const ticketToken = crypto.randomUUID();

    const ticketNumber = `LIA-${crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 10)
        .toUpperCase()}`;
    
    const now = new Date();

    const nextReminderAt = new Date(
        now.getTime() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let ticketReleaseAt: string | null = null;

    if (event.event_date) {
        const eventStart = new Date(
            `${event.event_date}T${event.start_time || "9:00:00"}`,
        );

        ticketReleaseAt = new Date(
            eventStart.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
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
                written_response: null,
                external_url: externalUrl || null,

                status: "registered",

                ticket_token: ticketToken,
                ticket_number: ticketNumber,

                confirmation_email_status: "requested",

                next_reminder_at:
                    ticketReleaseAt &&
                    new Date(nextReminderAt).getTime() <
                    new Date(ticketReleaseAt).getTime()
                        ? nextReminderAt
                        : null,
                
                ticket_release_at: ticketReleaseAt,
                ticket_email_status: "scheduled",
            })
            .select("id, ticket_number, ticket_token")
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

    const eventDateLabel = event.event_date
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "full",
            timeZone: "America/Denver",
        }).format(
            new Date(`${event.event_date}T12:00:00-06:00`),
        )
        : "Date to be announced."
    
    const eventTimeLabel = event.start_time
        ? `${event.start_time}${
            event.end_time ? ` - ${event.end_time}` : ""
        }`
        : "Time to be announced";
    
    const eventLocationLabel =
        event.location_name ||
        event.address ||
        "Location to be announced.";
    
    const confirmationSubject =
        `Registration confirmed: ${event.name}`;
    
    const emailResult = await sendEmail({
        to: studentEmail,
        subject: confirmationSubject,
        idempotencyKey:
            `event-registration-confirmation-${registration.id}`,
        html: renderBrandedEmail({
            preheader:
                `Your registration for ${event.name} was received`,
            eyebrow: "Event registration confirmed",
            title: `You're registered, ${firstName}!`,
            body: `
                <p style="margin:0 0 20px; color:#3f3f46; font-size:16px; line-height:1.7;">
                    We received your registration and compeition entry for
                    <strong>${escapeHtml(event.name)}</strong>
                </p>

                <table
                    role="presentation"
                    width=100%
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="width:100%; margin:24px 0; background:#f8f8f8; border-left:4px solid #c4122f;"
                >
                    <tr>
                        <td style="padding: 20px;">
                            <p style="margin:0 0 6px; color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase;">
                                Event
                            </p>

                            <p style="margin:0 0 16px; color:#18181b; font-size:19px; font-weight:700;">
                                ${escapeHtml(event.name)}
                            </p>

                            <p style="margin:0 0 16px; color:#18181b; font-size:19px; font-weight:700;">
                                ${escapeHtml(event.name)}
                            </p>

                            <p style="margin:0 0 7px; color:#52525b; font-size:14px line-height:1.6;">
                                <strong>Date:</strong>
                                ${escapeHtml(eventDateLabel)}
                            </p>

                            <p style="margin:0 0 7px; color:#52525b; font-size:14px; line-height:1.6;">
                                <strong>Time:</strong>
                                ${escapeHtml(eventTimeLabel)}
                            </p>

                            <p style="margin:0; color:#52525b; font-size:14px; line-height:1.6;">
                                <strong>Location:</strong>
                                ${escapeHtml(eventLocationLabel)}
                            </p>
                        </td>
                    </tr>
                </table>

                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="width:100%; margin:24px 0; border:1px solid #eadfe1; border-radius:8px;"
                >
                    <tr>
                        <td style="padding:18px;">
                            <p style="margin:0 0 6px; color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase;">
                                Registration reference
                            </p>

                            <p style="margin:0; color:#c4122f; font-size:21px; font-weight:700; letter-spacing:1px;">
                                ${escapeHtml(registration.ticket_number)}
                            </p>
                        </td>
                    </tr>
                </table>

                <h2 style="margin:28px 0 8px; color:#18181b; font-size:18px">
                    What happens next?
                </h2>

                <p style="margin:0 0 12px; color:#3f3f46; font-size:15px; line-height:1.7;">
                    We will send occasional event reminders to this email address.
                </p>

                <p style="margin:0; color:#3f3f46; font-size:15px; line-height:1.7;">
                    During the week of the event, you will receive another email
                    containing your event ticket and QR code. Your teacher will
                    also have access to a backup copy of your ticket.
                </p>
            `,
        }),
    });

    const confirmationStatus = emailResult.error
        ? "failed"
        : "sent";
    
    const confirmationSentAt = emailResult.error
        ? null
        : new Date().toISOString();
    
    const { error: registrationEmailUpdateError} =
        await supabase
            .from("event_registrations")
            .update({
                confirmation_email_status: confirmationStatus,
                confirmation_email_id: emailResult.id,
                confirmation_email_sent_at: confirmationSentAt,
                updated_at: new Date().toISOString(),
            })
            .eq("id", registration.id);
    
    if (registrationEmailUpdateError) {
        console.error(
            "Could not update registration confirmation email status",
            {
                registrationId: registration.id,
                message: registrationEmailUpdateError.message,
            },
        );
    }

    const { error: emailLogError } = await supabase
        .from("event_registration_emails")
        .insert({
            registration_id: registration.id,
            email_type: "confirmation",
            recipient: studentEmail,
            subject: confirmationSubject,
            status: confirmationStatus,
            requested_at: new Date().toISOString(),
            sent_at: confirmationSentAt,
            resend_email_id: emailResult.id,
            error_message: emailResult.error,
        });
    
    if (emailLogError) {
        console.error(
            "Could not save event confirmation email log",
            {
                registrationId: registration.id,
                message: emailLogError.message
            },
        );
    }

    redirect(
        `/event-registration/${registrationToken}?submitted=true&email=${
            emailResult.error ? "failed" : "sent"
        }`,
    );
}

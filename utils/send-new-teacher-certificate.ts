import "server-only";

import {
    createCertificateNumber,
    generateNewTeacherCertificate,
} from "@/utils/new-teacher-certificate";
import {
    escapeHtml,
    renderBrandedEmail,
    sendEmail,
} from "@/utils/email";
import { createAdminClient } from "@/utils/supabase/admin";

type CertificateAttempt = {
    id: string;
    createdAt: string;
    teacherProfileId: string;
    teacherEmail: string;
    firstName: string;
    lastName: string;
    score: number;
    totalQuestions: number;
};

export async function sendNewTeacherCertificate({
    attempt,
    testMode = false,
}: {
    attempt: CertificateAttempt;
    testMode?: boolean;
}) {
    if (!attempt.teacherEmail) {
        return "missing-email";
    }

    const teacherName =
        `${attempt.firstName} ${attempt.lastName}`.trim() || "LIA Educator";
    const completedAt = new Date(attempt.createdAt);

    if (testMode) {
        const certificateNumber = `TEST-${createCertificateNumber()}`;
        let certificate: Buffer;

        try {
            certificate = await generateNewTeacherCertificate({
                teacherName,
                completedAt,
                certificateNumber,
            });
        } catch (error) {
            console.error("Test certificate generation failed:", error);
            return "generation-failed";
        }

        const safeName =
            teacherName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") ||
            "lia-educator";

        const emailResult = await sendEmail({
            to: attempt.teacherEmail,
            subject: "[TEST] Your LIA New Teacher Training certificate",
            html: renderBrandedEmail({
                preheader: "Test delivery of an LIA training certificate.",
                eyebrow: "Test certificate",
                title: `Congratulations, ${attempt.firstName || teacherName}!`,
                body:`
                    <p style="margin:0 0 20px; color:#3f3f46; font-size:16px; line-height:1.7;">
                        This is a test delivery from the local LIA Portal.
                        The attached certificate is a preview and does not
                        create another official certificate record.
                    </p>

                    <table role="presentation" width="100%" cellspacing="0"
                        cellpadding="0" border="0"
                        style="width:100%; background-color:#f0fdf4;
                        border-left:4px solid #16a34a;">
                        <tr>
                            <td style="padding:20px 22px;">
                                <p style="margin:0 0 6px; color:#15803d;
                                    font-size:12px; font-weight:700;
                                    text-transform:uppercase;">
                                    Test certificate attached
                                </p>
                                <p style="margin:0; color:#18181b;
                                    font-size:17px; font-weight:700;">
                                    ${escapeHtml(teacherName)}
                                </p>
                                <p style="margin:6px 0 0; color:#52525b;
                                    font-size:14px;">
                                    Score: ${attempt.score} out of ${attempt.totalQuestions}
                                </p>
                            </td>
                        </tr>
                    </table>
                `,
            }),
            attachments: [
                {
                    filename: `${safeName}-lia-training-certificate-test.pdf`,
                    content: certificate,
                    contentType: "application/pdf",
                },
            ],
            idempotencyKey: `new-teacher-certificate-test-${attempt.id}`,
        });

        if (emailResult.error) {
            return "email-failed";
        }

        return "test-sent";
    }

    const admin = createAdminClient();

    const { data: existing, error: existingError } = await admin
        .from("teacher_module_quiz_attempts")
        .select(`
                id,
                certificate_number,
                certificate_issued_at,
                certificate_emailed_at   
            `)
        .eq("teacher_profile_id", attempt.teacherProfileId)
        .not("certificate_issued_at", "is", null)
        .order("certificate_issued_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (existingError) {
        console.error("Certificate lookup failed:", {
            teacherProfileId: attempt.teacherProfileId,
            error: existingError,
        });
        return "lookup-failed";
    }
    
    if (existing?.certificate_emailed_at) {
        return "already-sent";
    }

    if (existing) {
        console.error("Certificate was issued but delivery is not recorded:", {
            attemptId: existing.id,
            certificateNumber: existing.certificate_number,
        });
        return "delivery-pending";
    }

    const targetAttemptId = attempt.id;
    const certificateNumber = createCertificateNumber();
    const { data: claimedAttempt, error: claimError } = await admin
        .from("teacher_module_quiz_attempts")
        .update({
            certificate_number: certificateNumber,
            certificate_issued_at: completedAt.toISOString(),
            certificate_email_error: null,
        })
        .eq("id", attempt.id)
        .is("certificate_issued_at", null)
        .select("id")
        .maybeSingle();
    
    if (claimError) {
        if (claimError.code === "23505") {
            return "already-sent";
        }

        console.error("Certificate claim failed:", claimError);
        return "generation-failed";
    }

    if (!claimedAttempt) {
        console.error("Certificate attempt could not be claimed:", {
            attemptId: attempt.id,
        });
        return "delivery-pending";
    }

    let certificate: Buffer;

    try {
        certificate = await generateNewTeacherCertificate({
            teacherName,
            completedAt,
            certificateNumber,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Certificate generation failed."
        
        const { error: generationRecordError } = await admin
            .from("teacher_module_quiz_attempts")
            .update({ certificate_email_error: message })
            .eq("id", targetAttemptId);

        if (generationRecordError) {
            console.error(
                "Certificate generation error could not be recorded:",
                generationRecordError,
            );
        }
        
        console.error("Certificate generation failed:", error);
        return "generation-failed";
    }

    const safeName =
        teacherName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") ||
        "lia-educator";
    
    const emailResult = await sendEmail({
        to: attempt.teacherEmail,
        subject: "Your LIA New Teacher Training certificate",
        html: renderBrandedEmail({
            preheader: "You completed the LIA New Teacher Training.",
            eyebrow: "Training complete",
            title: `Congratulations, ${attempt.firstName || teacherName}!`,
            body:`
                <p style="margin:0 0 20px; color:#3f3f46; font-size:16px; line-height:1.7;">
                    You passed the Latinos In Action New Teacher Training quiz
                    with a score of
                    <strong>${attempt.score} out of ${attempt.totalQuestions}</strong>
                </p>

                <table role="presentation" width="100%" cellspacing="0"
                    cellpadding="0" border="0"
                    style="width:100%; background-color:#f0fdf4;
                    border-left:4px solid #16a34a;">
                    <tr>
                        <td style="padding:20px 22px;">
                            <p style="margin:0 0 6px; color:#15803d;
                                font-size:12px; font-weight:700;
                                text-transform:uppercase;">
                                Certificate attached
                            </p>
                            <p style="margin:0; color:#18181b;
                                font-size:17px; font-weight:700;">
                                ${escapeHtml(teacherName)}
                            </p>
                            <p style="margin:6px 0 0; color:#52525b;
                                font-size:14px;">
                                Certificate ${escapeHtml(certificateNumber)}
                            </p>
                        </td>
                    </tr>
                </table>

                <p style="margin:22px 0 0; color: #52525b;
                    font-size:15px; line-height:1.7;">
                    Your personalized certificate is attached as a PDF.
                    Please download it and keep it for your records.
                </p>
            `,
        }),
        attachments: [
            {
                filename: `${safeName}-lia-training-certificate.pdf`,
                content: certificate,
                contentType: "application/pdf",
            },
        ],
        idempotencyKey: `new-teacher-certificate-${certificateNumber}`,
    });

    if (emailResult.error) {
        const { error: emailErrorRecordError } = await admin
            .from("teacher_module_quiz_attempts")
            .update({
                certificate_email_error: emailResult.error,
            })
            .eq("id", targetAttemptId);

        if (emailErrorRecordError) {
            console.error(
                "Certificate email failure could not be recorded:",
                emailErrorRecordError,
            );
        }
        
        return "email-failed";
    }

    const { data: recordedAttempt, error: recordError } = await admin
        .from("teacher_module_quiz_attempts")
        .update({
            certificate_emailed_at: new Date().toISOString(),
            certificate_resend_id: emailResult.id,
            certificate_email_error: null,
        })
        .eq("id", targetAttemptId)
        .select("id")
        .maybeSingle();

    if (recordError || !recordedAttempt) {
        console.error("Certificate email sent but database update failed:", {
            attemptId: targetAttemptId,
            certificateNumber,
            resendId: emailResult.id,
            error: recordError,
        });
        return "recording-failed";
    }
    
    return "sent";
}

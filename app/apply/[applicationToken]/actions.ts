"use server";

import { redirect } from "next/navigation";
import { createApplicationClient } from "../application-client";
import { escapeHtml, renderBrandedEmail, sendEmail } from "@/utils/email";
import {
    questionInputName,
    ALLOWED_APPLICATION_FILE_TYPES,
    APPLICATION_RECOMMENDATION_BUCKET,
    MAX_APPLICATION_FILE_SIZE,
    type ApplicationFileAnswer,
} from "@/utils/application-form";

function getFormValue(formData: FormData, name: string) {
    return String(formData.get(name) ?? "").trim();
}

function cleanFileName(fileName: string) {
    return fileName
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0,150);
}

export async function submitApplication(
    applicationToken: string,
    formData: FormData,
) {
    const supabase = createApplicationClient();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select(`
            id,
            name,
            school_id,
            teacher_profile_id,
            applications_open,
            schools (
                name
            )
        `)
        .eq("application_token", applicationToken)
        .maybeSingle();

    if (!liaClass || !liaClass.applications_open) {
        redirect(`/apply/${applicationToken}?error=closed`);
    }

    const language =
        getFormValue(formData, "language") === "es" ? "es" : "en";

    const { data: publishedForm } = await supabase
        .from("application_forms")
        .select("id")
        .eq("lia_class_id", liaClass.id)
        .eq("status", "published")
        .maybeSingle();

    const { data: questionRows } = publishedForm
        ? await supabase
              .from("application_questions")
              .select(`
                  id,
                  question_key,
                  label_en,
                  label_es,
                  question_type,
                  required,
                  position
              `)
              .eq("application_form_id", publishedForm.id)
              .order("position", { ascending: true })
        : { data: null };

    const questions = questionRows ?? [];
    const answersByKey = new Map<string, string>();

    const answersToInsert: Array<{
        question_id: string;
        question_label: string;
        answer: string | ApplicationFileAnswer;
    }> = [];

    const pendingFiles: Array<{
        questionId: string;
        questionLabel: string;
        file: File;
    }> = [];

    if (publishedForm) {
        for (const question of questions) {
            const fieldName = questionInputName(question.id);
            const questionLabel =
                language === "es" && question.label_es
                    ? question.label_es
                    : question.label_en;

            if (question.question_type === "file_upload") {
                const fileValue = formData.get(fieldName);
                const hasFile =
                    fileValue instanceof File && fileValue.size > 0;

                if (question.required && !hasFile) {
                    redirect(
                        `/apply/${applicationToken}?error=missing-fields`,
                    );
                }

                if (!hasFile) {
                    answersToInsert.push({
                        question_id: question.id,
                        question_label: questionLabel,
                        answer: "",
                    });

                    continue;
                }

                const file = fileValue as File;

                if (file.size > MAX_APPLICATION_FILE_SIZE) {
                    redirect(
                        `/apply/${applicationToken}?error=file-too-large`,
                    );
                }

                if (
                    !ALLOWED_APPLICATION_FILE_TYPES.includes(
                        file.type as (typeof ALLOWED_APPLICATION_FILE_TYPES)[number],
                    )
                ) {
                    redirect(
                        `/apply/${applicationToken}?error=invalid-file-type`,
                    );
                }

                pendingFiles.push({
                    questionId: question.id,
                    questionLabel,
                    file,
                });

                continue;
            }

            const answer = getFormValue(formData, fieldName);

            if (question.required && !answer) {
                redirect(
                    `/apply/${applicationToken}?error=missing-fields`,
                );
            }

            answersByKey.set(question.question_key, answer);

            answersToInsert.push({
                question_id: question.id,
                question_label: questionLabel,
                answer,
            });
        }
    }

    const getAnswer = (key: string) => {
        if (publishedForm) {
            return answersByKey.get(key)?.trim() ?? "";
        }

        return getFormValue(formData, key);
    };

    const firstName = getAnswer("first_name");
    const lastName = getAnswer("last_name");
    const email = getAnswer("email").toLowerCase();
    const gradeLevel = getAnswer("grade_level");
    const gpaValue = getAnswer("gpa");
    const gpa = Number(gpaValue);

    if (!firstName || !lastName || !gpaValue) {
        redirect(`/apply/${applicationToken}?error=missing-fields`);
    }

    if (!Number.isFinite(gpa) || gpa < 0 || gpa > 5) {
        redirect(`/apply/${applicationToken}?error=invalid-gpa`);
    }

    if (email) {
        const { data: existingApplication } = await supabase
            .from("lia_class_applications")
            .select("id")
            .eq("lia_class_id", liaClass.id)
            .eq("email", email)
            .is("archived_at", null)
            .limit(1)
            .maybeSingle();

        if (existingApplication) {
            redirect(
                `/apply/${applicationToken}?error=already-submitted`,
            );
        }
    }

    const { data: application, error: applicationError } =
        await supabase
            .from("lia_class_applications")
            .insert({
                lia_class_id: liaClass.id,
                application_form_id: publishedForm?.id ?? null,
                school_id: liaClass.school_id,
                teacher_profile_id: liaClass.teacher_profile_id,
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                preferred_language: language,
                grade_level: gradeLevel || null,
                advisory_teacher:
                    getAnswer("advisory_teacher") || null,
                color_team: getAnswer("color_team") || null,
                why_lia: getAnswer("why_lia") || null,
                skills_strengths:
                    getAnswer("skills_strengths") || null,
                why_good_fit: getAnswer("why_good_fit") || null,
                extracurriculars:
                    getAnswer("extracurriculars") || null,
                inspiration: getAnswer("inspiration") || null,
                academic_review:
                    getAnswer("academic_review") || null,
                gpa,
                low_grade_explanation:
                    getAnswer("low_grade_explanation") || null,
                three_rs_review:
                    getAnswer("three_rs_review") || null,
            })
            .select("id")
            .single();

    if (applicationError || !application) {
        redirect(`/apply/${applicationToken}?error=submit-failed`);
    }

    const uploadedFilePaths: string[] = [];

    for (const pendingFile of pendingFiles) {
        const safeFileName =
            cleanFileName(pendingFile.file.name) || "recommendation";

        const filePath = [
            liaClass.id,
            application.id,
            `${pendingFile.questionId}-${crypto.randomUUID()}-${safeFileName}`,
        ].join("/");

        const { error: uploadError } = await supabase.storage
            .from(APPLICATION_RECOMMENDATION_BUCKET)
            .upload(filePath, pendingFile.file, {
                cacheControl: "3600",
                upsert: false,
                contentType: pendingFile.file.type,
            });

        if (uploadError) {
            console.error("Application recommendation upload failed", {
                bucket: APPLICATION_RECOMMENDATION_BUCKET,
                filePath,
                contentType: pendingFile.file.type,
                fileSize: pendingFile.file.size,
                message: uploadError.message,
            });

            if (uploadedFilePaths.length > 0) {
                await supabase.storage
                    .from(APPLICATION_RECOMMENDATION_BUCKET)
                    .remove(uploadedFilePaths);
            }

            await supabase
                .from("lia_class_applications")
                .delete()
                .eq("id", application.id);

            redirect(
                `/apply/${applicationToken}?error=file-upload-failed`,
            );
        }

        uploadedFilePaths.push(filePath);

        answersToInsert.push({
            question_id: pendingFile.questionId,
            question_label: pendingFile.questionLabel,
            answer: {
                kind: "file",
                bucket: APPLICATION_RECOMMENDATION_BUCKET,
                path: filePath,
                originalName: pendingFile.file.name.slice(0, 255),
                contentType: pendingFile.file.type,
                size: pendingFile.file.size,
            },
        });
    }

    if (publishedForm && answersToInsert.length > 0) {
        const { error: answersError } = await supabase
            .from("application_answers")
            .insert(
                answersToInsert.map((answer) => ({
                    application_id: application.id,
                    ...answer,
                })),
            );

        if (answersError) {
            console.error("Application file answer could not be saved", {
                applicationId: application.id,
                message: answersError.message,
                code: answersError.code,
                details: answersError.details,
            });

            if (uploadedFilePaths.length > 0) {
                await supabase.storage
                    .from(APPLICATION_RECOMMENDATION_BUCKET)
                    .remove(uploadedFilePaths);
            }
            // Prevent an incomplete application from remaining if its
            // dynamic answers could not be stored.
            await supabase
                .from("lia_class_applications")
                .delete()
                .eq("id", application.id);

            redirect(
                `/apply/${applicationToken}?error=submit-failed`,
            );
        }
    }

    const school = Array.isArray(liaClass.schools)
        ? liaClass.schools[0]
        : liaClass.schools;
    
    let confirmationEmailSent = false;

    const confirmationCopy =
        language === "es"
            ? {
                subject: "Recibimos tu solicitud de LIA",
                preheader: `Recibimos tu solicitud para ${liaClass.name}.`,
                eyebrow: "Solicitud recibida",
                title: `¡Gracias por enviar tu solicitud, ${firstName}!`,
                intro:
                "Tu solicitud de Latinos In Action se envió correctamente.",
                programLabel: "Programa",
                nextTitle: "¿Qué sucede después?",
                nextBody:
                "Tu maestro revisará tu solicitud y se comunicará contigo cuando haya una decisión final.",
            }
            : {
                subject: "Your LIA application has been received",
                preheader: `We received your application for ${liaClass.name}.`,
                eyebrow: "Application received",
                title: `Thank you for applying, ${firstName}!`,
                intro:
                "Your Latinos In Action application was submitted successfully.",
                programLabel: "Program",
                nextTitle: "What happens next?",
                nextBody:
                "Your teacher will review your application and follow up when a final decision has been made.",
            }

    if (email) {
        const emailResult = await sendEmail({
            to: email,
            subject: confirmationCopy.subject,
            html: renderBrandedEmail({
                preheader: confirmationCopy.preheader,
                eyebrow: confirmationCopy.eyebrow,
                title: confirmationCopy.title,
                language,
                body: `
                        <p style="margin:0 0 20px;">
                            ${confirmationCopy.intro}
                        </p>

                        <div style="padding:18px; background:#f8f8f8; border-left:4px solid #ce0e2d;">
                            <div style="font-size:12px; font-weight:700; color:#71717a; text-transform:uppercase;">
                            ${confirmationCopy.programLabel}
                            </div>

                            <div style="margin-top:6px; font-size:17px; font-weight:700; color:#18181b;">
                            ${escapeHtml(liaClass.name)}
                            </div>

                            <div style="margin-top:4px; color:#52525b;">
                            ${escapeHtml(school?.name ?? "")}
                            </div>
                        </div>

                        <h2 style="margin:26px 0 8px; font-size:18px; color:#18181b;">
                            ${confirmationCopy.nextTitle}
                        </h2>

                        <p style="margin:0;">
                            ${confirmationCopy.nextBody}
                        </p>
                        `,
            }),
        });

        confirmationEmailSent = !emailResult.error;
    }
    
    redirect(
        `/apply/${applicationToken}?success=${
            confirmationEmailSent ? "email-sent" : "submitted"
        }&lang=${language}`,
    );
}

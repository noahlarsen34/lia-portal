"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { escapeHtml, renderBrandedEmail, sendEmail } from "@/utils/email";
import { getValidStudentTier } from "@/utils/student-tier";

type ApplicationStatus = "submitted" | "maybe" | "accepted" | "declined";

function isFinalApplicationStatus(status: string | null | undefined) {
    return status === "accepted" || status === "declined";
}

async function getTeacherApplication(
    classId: string,
    applicationId: string,
) {
    const { supabase, profile } = await requireTeacher();

    const { data: application } = await supabase
        .from("lia_class_applications")
        .select(`
                id,
                lia_class_id,
                school_id,
                teacher_profile_id,
                first_name,
                last_name,
                email,
                grade_level,
                preferred_language,
                status,
                lia_classes (
                    id,
                    name,
                    school_id,
                    teacher_profile_id,
                    schools (
                        name
                    )
                )
            `,
        )
        .eq("id", applicationId)
        .eq("lia_class_id", classId)
        .maybeSingle();

    const liaClass = Array.isArray(application?.lia_classes)
        ? application?.lia_classes[0]
        : application?.lia_classes;
    
    if (!application || !liaClass || liaClass.teacher_profile_id !== profile.id) {
        redirect(`/teacher/classes/${classId}/applicants?error=not-found`);
    }

    return { supabase, profile, application, liaClass };
}

export async function updateApplicationStatus (
    classId: string,
    applicationId: string,
    status: ApplicationStatus,
) {
    if (!["submitted", "maybe", "accepted", "declined"].includes(status)) {
        redirect(`/teacher/classes/${classId}/applicants?error=invalid-status`);
    }

    const { supabase, application, liaClass } = await getTeacherApplication(classId, applicationId);

    if (isFinalApplicationStatus(application.status)) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=final-decision`,
        );
    }

    const { error } = await supabase
        .from("lia_class_applications")
        .update({
            status,
            reviewed_at: status === "submitted" ? null : new Date().toISOString(),
        })
        .eq("id", applicationId)
        .eq("lia_class_id", classId);
    
    if (error) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=update-failed`,
        );
    }

    if (status === "declined") {
        await sendApplicationDecisionEmail({
            application,
            liaClass,
            decision: "declined",
        });
    }

    revalidatePath(`/teacher/classes/${classId}/applicants`);
    revalidatePath(`/teacher/classes/${classId}/applicants/${applicationId}`);
    redirect(
        `/teacher/classes/${classId}/applicants/${applicationId}?success=status-updated`,
    );
}

export async function updateApplicationReview(
    classId: string,
    applicationId: string,
    formData: FormData,
) {
    const { supabase } = await getTeacherApplication(classId, applicationId);

    const recommendationComplete =
        formData.get("recommendation_complete") === "on";
    const completedInterview = formData.get("completed_interview") === "on";
    const interviewAgain = formData.get("interview_again") === "on";
    const teacherComments = String(formData.get("teacher_comments") ?? "").trim();

    const { error } = await supabase
        .from("lia_class_applications")
        .update({
            recommendation_complete: recommendationComplete,
            completed_interview: completedInterview,
            interview_again: interviewAgain,
            teacher_comments: teacherComments || null,
        })
        .eq("id", applicationId)
        .eq("lia_class_id", classId);
    
    if (error) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=update-failed`,
        );
    }

    revalidatePath(`/teacher/classes/${classId}/applicants`);
    revalidatePath(`/teacher/classes/${classId}/applicants/${applicationId}`);
    redirect(`/teacher/classes/${classId}/applicants/${applicationId}?success=review-saved`);
}

export async function acceptApplication(
    classId: string,
    applicationId: string,
    formData: FormData,
) {
    const { supabase, application, liaClass } = await getTeacherApplication(
        classId,
        applicationId,
    )
    const tier = getValidStudentTier(formData.get("tier"));

    if (!tier) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=tier-required`,
        );
    }

    if (isFinalApplicationStatus(application.status)) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=final-decision`,
        );
    }

    let studentId: string | null = null;
    const normalizedEmail = application.email?.trim().toLowerCase() || null;
    
    if (normalizedEmail) {
        const { data: existingStudent } = await supabase
            .from("students")
            .select("id")
            .eq("school_id", liaClass.school_id)
            .eq("email", normalizedEmail)
            .maybeSingle();
        
        studentId = existingStudent?.id ?? null;
    }

    if (!studentId) {
        const { data: student, error: studentError } = await supabase
            .from("students")
            .insert({
                school_id: liaClass.school_id,
                first_name: application.first_name,
                last_name: application.last_name,
                email: normalizedEmail,
                grade_level: application.grade_level || null,
            })
            .select("id")
            .single();
        
        if (studentError || !student) {
            redirect(`/teacher/classes/${classId}/applicants?error=create-student-failed`);
        }

        studentId = student.id;
    }

    const { data: existingEnrollment } = await supabase
        .from("lia_class_students")
        .select("id, status")
        .eq("lia_class_id", classId)
        .eq("student_id", studentId)
        .maybeSingle();
    
    if (existingEnrollment) {
        if (existingEnrollment.status !== "removed") {
            redirect(
                `/teacher/classes/${classId}/applicants/${applicationId}?error=already-enrolled`,
            );
        }

        if (existingEnrollment.status === "removed") {
            const { error: reactivateError } = await supabase
                .from("lia_class_students")
                .update({
                    status: "active",
                    tier,
                    removed_at: null,
                })
                .eq("id", existingEnrollment.id)
                .eq("lia_class_id", classId);
            
            if (reactivateError) {
                redirect(`/teacher/classes/${classId}/applicants?error=enroll-failed`);
            }
        }
    } else {
        const { error: enrollmentError } = await supabase
            .from("lia_class_students")
            .insert({
                lia_class_id: classId,
                student_id: studentId,
                status: "active",
                officer_role: "member",
                tier,
            });
        if (enrollmentError) {
            redirect(
                `/teacher/classes/${classId}/applicants/${applicationId}?error=enroll-failed`,
            );
        }
    }

    const { error: applicationError} = await supabase
        .from("lia_class_applications")
        .update({
            status: "accepted",
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId)
        .eq("lia_class_id", classId);
    
    if (applicationError) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=update-failed`,
        );
    }

    await sendApplicationDecisionEmail({
        application,
        liaClass,
        decision: "accepted"
    });

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/teacher/classes/${classId}/students`);
    revalidatePath(`/teacher/classes/${classId}/applicants`);
    revalidatePath(`/teacher/classes/${classId}/applicants/${applicationId}`);
    revalidatePath(`/schools/${liaClass.school_id}`);

    redirect(
        `/teacher/classes/${classId}/applicants/${applicationId}?success=status-updated`,
    );
}

async function sendApplicationDecisionEmail({
    application,
    liaClass,
    decision,
} : {
    application: {
        first_name: string;
        email: string | null;
        preferred_language: string | null;
    };
    liaClass : {
        name: string
        schools?: {name: string | null } | {name: string | null }[] | null;
    };
    decision: "accepted" | "declined";
}) {
    if (!application.email) {
        return;
    }

    const accepted = decision === "accepted";

    const isSpanish = application.preferred_language === "es";

    const copy = isSpanish
        ? accepted
            ? {
                subject: "¡Bienvenido a Latinos In Action!",
                preheader: `Tu solicitud para ${liaClass.name} fue aceptada.`,
                eyebrow: "Solicitud aceptada",
                title: `¡Bienvenido a LIA, ${application.first_name}!`,
                intro:
                "¡Felicidades! Nos complace informarte que tu solicitud para Latinos In Action fue aceptada.",
                badge: "Solicitud aceptada",
                closing:
                "Tu maestro compartirá contigo los próximos pasos. Esperamos ver el liderazgo, las fortalezas y la perspectiva que aportarás.",
            }
            : {
                subject: "Una actualización sobre tu solicitud de LIA",
                preheader: `Se tomó una decisión sobre tu solicitud para ${liaClass.name}.`,
                eyebrow: "Actualización de la solicitud",
                title: `Gracias por enviar tu solicitud, ${application.first_name}`,
                intro:
                "Gracias por el tiempo y la dedicación que pusiste en tu solicitud de Latinos In Action.",
                badge: "Decisión de la solicitud",
                closing:
                "Después de una revisión cuidadosa, no fuiste seleccionado para esta clase en este momento. Agradecemos tu interés y te animamos a seguir buscando oportunidades para crecer como líder.",
            }
        : accepted
            ? {
                subject: "Welcome to Latinos In Action!",
                preheader: `Your application for ${liaClass.name} was accepted.`,
                eyebrow: "Application accepted",
                title: `Welcome to LIA, ${application.first_name}!`,
                intro:
                "Congratulations! We are pleased to let you know that your Latinos In Action application was accepted.",
                badge: "Application accepted",
                closing:
                "Your teacher will share the next steps with you. We look forward to the leadership, strengths, and perspective you will bring.",
            }
            : {
                subject: "An update on your LIA application",
                preheader: `A decision was made about your application for ${liaClass.name}.`,
                eyebrow: "Application update",
                title: `Thank you for applying, ${application.first_name}`,
                intro:
                "Thank you for the time and care you put into your Latinos In Action application.",
                badge: "Application decision",
                closing:
                "After careful review, you were not selected for this class at this time. We appreciate your interest and encourage you to continue pursuing opportunities to grow as a leader.",
            };

    await sendEmail({
        to: application.email,
        subject: copy.subject,
        html: renderBrandedEmail({
            preheader: copy.preheader,
            eyebrow: copy.eyebrow,
            title: copy.title,
            language: isSpanish ? "es" : "en",
            body: `
                    <p style="margin:0 0 20px;">
                        ${copy.intro}
                    </p>

                    <div style="
                        padding:18px;
                        background:${accepted ? "#f0fdf4" : "#fafafa"};
                        border-left:4px solid ${accepted ? "#16a34a" : "#a1a1aa"};
                    ">
                        <strong style="color:${accepted ? "#166534" : "#3f3f46"};">
                        ${copy.badge}
                        </strong>

                        <div style="margin-top:8px; color:#52525b;">
                        ${escapeHtml(liaClass.name)}
                        </div>
                    </div>

                    <p style="margin:22px 0 0;">
                        ${copy.closing}
                    </p>
                    `,
        }),
    });
}

export async function archiveApplication(
    classId: string,
    applicationId: string,
) {
    const { supabase } = await getTeacherApplication(classId, applicationId);

    const { error } = await supabase
        .from("lia_class_applications")
        .update({
            archived_at: new Date().toISOString(),
        })
        .eq("id", applicationId)
        .eq("lia_class_id", classId);
    
    if (error) {
        redirect(`/teacher/classes/${classId}/applicants?error=archive-failed`);
    }

    revalidatePath(`/teacher/classes/${classId}/applicants`);
    redirect(`/teacher/classes/${classId}/applicants?success=archived`);
}

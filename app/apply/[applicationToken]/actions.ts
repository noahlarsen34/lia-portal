"use server";

import { redirect } from "next/navigation";
import { createApplicationClient } from "../application-client";
import { escapeHtml, renderBrandedEmail, sendEmail } from "@/utils/email";

export async function submitApplication(
    applicationToken: string,
    formData: FormData,
) {
    const supabase = createApplicationClient();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name, school_id, teacher_profile_id, applications_open, schools (name)")
        .eq("application_token", applicationToken)
        .maybeSingle();
    
    if (!liaClass || !liaClass.applications_open) {
        redirect(`/apply/${applicationToken}?error=closed`);
    }

    const language =
        String(formData.get("language") ?? "") === "es" ? "es" : "en";

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const gpaValue = String(formData.get("gpa") ?? "").trim();
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
            redirect(`/apply/${applicationToken}?error=already-submitted`);
        }
    }

    const { error } = await supabase.from("lia_class_applications").insert({
        lia_class_id: liaClass.id,
        school_id: liaClass.school_id,
        teacher_profile_id: liaClass.teacher_profile_id,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        preferred_language: language,
        grade_level: String(formData.get("grade_level") ?? "").trim() || null,
        advisory_teacher: String(formData.get("advisory_teacher") ?? "").trim() || null,
        color_team: String(formData.get("color_team") ?? "").trim() || null,
        why_lia: String(formData.get("why_lia") ?? "").trim() || null,
        skills_strengths: String(formData.get("skills_strengths") ?? "").trim() || null,
        why_good_fit: String(formData.get("why_good_fit") ?? "").trim() || null,
        extracurriculars: String(formData.get("extracurriculars") ?? "").trim() || null,
        inspiration: String(formData.get("inspiration") ?? "").trim() || null,
        academic_review: String(formData.get("academic_review") ?? "").trim() || null,
        gpa,
        low_grade_explanation:
            String(formData.get("low_grade_explanation") ?? "").trim() || null,
        three_rs_review: String(formData.get("three_rs_review") ?? "").trim() || null,
    })

    if (error) {
        redirect(`/apply/${applicationToken}?error=submit-failed`);
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

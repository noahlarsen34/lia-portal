"use server";

import { redirect } from "next/navigation";
import { createApplicationClient } from "../application-client";
import { sendEmail, escapeHtml } from "@/utils/email";

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

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();


    if (!firstName || !lastName) {
        redirect(`/apply/${applicationToken}?error=missing-fields`);
    }

    if (email) {
        const { data: existingApplication } = await supabase
            .from("lia_class_applications")
            .select("id")
            .eq("lia_class_id", liaClass.id)
            .eq("email", email)
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
        grade_level: String(formData.get("grade_level") ?? "").trim() || null,
        advisory_teacher: String(formData.get("advisory_teacher") ?? "").trim() || null,
        color_team: String(formData.get("color_team") ?? "").trim() || null,
        why_lia: String(formData.get("why_lia") ?? "").trim() || null,
        skills_strengths: String(formData.get("skills_strengths") ?? "").trim() || null,
        why_good_fit: String(formData.get("why_good_fit") ?? "").trim() || null,
        extracurriculars: String(formData.get("extracurriculars") ?? "").trim() || null,
        inspiration: String(formData.get("inspiration") ?? "").trim() || null,
        academic_review: String(formData.get("academic_review") ?? "").trim() || null,
        three_rs_review: String(formData.get("three_rs_review") ?? "").trim() || null,
    })

    if (error) {
        redirect(`/apply/${applicationToken}?error=submit-failed`);
    }

    const school = Array.isArray(liaClass.schools)
        ? liaClass.schools[0]
        : liaClass.schools;
    
    if (email) {
        await sendEmail({
            to: email,
            subject: "Your LIA application has been received",
            html:`
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h1>Your LIA application has been received</h1>
                    <p>Hi ${escapeHtml(firstName)},</p>
                    <p>
                        Thank you for applying to Latinos In Action.
                        Your application for <strong>${escapeHtml(liaClass.name)}</strong>
                        ${school?.name ? `at <strong>${escapeHtml(school.name)}</strong>` : ""}
                        has been received.
                    </p>
                    <p>
                        Your teacher will review your application and follow up with a final decision.
                    </p>
                    <p>Thank you, <br/>Latinos In Action</p>
                </div>
                `,
        });
    }
    
    redirect(`/apply/${applicationToken}?success=submitted`);
}

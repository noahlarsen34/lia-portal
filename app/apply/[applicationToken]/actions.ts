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
            html: renderBrandedEmail({
                preheader: `We received your application for ${liaClass.name}.`,
                eyebrow: "Application received",
                title: `Thanks for applying, ${firstName}!`,
                body: `
                  <p style="margin:0 0 22px; color:#3f3f46; font-size:16px; line-height:1.7;">
                    Your Latinos In Action application is safely in. Here is a quick
                    confirmation of what you submitted.
                  </p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#fafafa; border:1px solid #e4e4e7; border-radius:6px;">
                    <tr>
                      <td style="padding:20px 22px;">
                        <p style="margin:0 0 5px; color:#71717a; font-size:11px; font-weight:700; text-transform:uppercase;">Program</p>
                        <p style="margin:0; color:#18181b; font-size:16px; font-weight:700; line-height:1.5;">${escapeHtml(liaClass.name)}</p>
                        ${
                            school?.name
                                ? `<p style="margin:6px 0 0; color:#52525b; font-size:14px; line-height:1.5;">${escapeHtml(school.name)}</p>`
                                : ""
                        }
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin-top:20px; background-color:#fff5f6; border-left:4px solid #c4122f;">
                    <tr>
                      <td style="padding:18px 20px;">
                        <p style="margin:0 0 5px; color:#991b31; font-size:14px; font-weight:700;">What happens next?</p>
                        <p style="margin:0; color:#52525b; font-size:14px; line-height:1.6;">
                          Your teacher will review your application and contact you when a final decision is ready.
                        </p>
                      </td>
                    </tr>
                  </table>
                `,
            }),
        });
    }
    
    redirect(`/apply/${applicationToken}?success=submitted`);
}

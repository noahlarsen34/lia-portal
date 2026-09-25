"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { US_STATE_SET } from "@/utils/us-states";
import {
  escapeHtml,
  renderBrandedEmail,
  sendEmail,
} from "@/utils/email";
import { getOnboardingRpm } from "@/utils/onboarding-routing";

export type InterestFormState = {
  status: "idle" | "error" | "success";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_JOB_TITLES = new Set([
  "Student",
  "Principal",
  "Assistant Principal",
  "Administrator",
  "Teacher",
]);
const VALID_SCHOOL_LEVELS = new Set(["Elementary", "Middle", "High"]);
const VALID_REGIONS = new Set(["North", "Central", "South"]);

function text(formData: FormData, name: string, maxLength = 250) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

export async function submitSchoolInterest(
  _previousState: InterestFormState,
  formData: FormData,
): Promise<InterestFormState> {
  const schoolName = text(formData, "school_name");
  const districtName = text(formData, "district_name");
  const address = text(formData, "address", 500);
  const state = text(formData, "state", 100);
  const region = text(formData, "region", 20);
  const requiresRegion = state === "Utah" || state === "Florida";
  const firstName = text(formData, "contact_first_name", 100);
  const lastName = text(formData, "contact_last_name", 100);
  const title = text(formData, "contact_title", 150);
  const email = text(formData, "contact_email", 254).toLowerCase();
  const phone = text(formData, "contact_phone", 40);
  const principalName = text(formData, "principal_name", 200);
  const principalEmail = text(formData, "principal_email", 254).toLowerCase();
  const desiredStartTerm = text(formData, "desired_start_term", 100);
  const consentToContact = formData.get("consent_to_contact") === "yes";
  const gradeLevels = formData
    .getAll("grade_levels")
    .map(String)
    .filter((value) => VALID_SCHOOL_LEVELS.has(value));

  if (
    !schoolName ||
    !address ||
    !US_STATE_SET.has(state) ||
    (requiresRegion && !VALID_REGIONS.has(region)) ||
    !firstName ||
    !lastName ||
    !VALID_JOB_TITLES.has(title) ||
    !EMAIL_PATTERN.test(email) ||
    !principalName ||
    !EMAIL_PATTERN.test(principalEmail) ||
    !desiredStartTerm ||
    gradeLevels.length === 0 ||
    !consentToContact
  ) {
    return {
      status: "error",
      message: "Please complete every required field and confirm we may contact you.",
    };
  }

  const supabase = createAdminClient();
  const duplicateWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("school_interest_submissions")
    .select("id")
    .eq("contact_email", email)
    .ilike("school_name", schoolName)
    .gte("submitted_at", duplicateWindow)
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.info("Skipped duplicate school interest submission", {
      existingSubmissionId: existing.id,
      schoolName,
      email,
    });

    return {
      status: "success",
      message:
        "We already received this interest form within the last 24 hours, so no duplicate emails were sent. Our team will be in touch.",
    };
  }

    const rpm = getOnboardingRpm(
    state,
    requiresRegion ? region : null,
  );

  const { data: rpmProfile, error: rpmError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", rpm.email)
    .in("role", ["admin", "rpm"])
    .limit(1)
    .maybeSingle();

  if (rpmError) {
    console.error("Could not find onboarding RPM", {
      rpm: rpm.email,
      message: rpmError.message,
    });
  }

  const { data: submission, error } = await supabase
    .from("school_interest_submissions")
    .insert({
      school_name: schoolName,
      district_name: districtName || null,
      city: address,
      state,
      region: requiresRegion ? region : null,
      website: text(formData, "website", 500) || null,
      contact_first_name: firstName,
      contact_last_name: lastName,
      contact_title: title,
      contact_email: email,
      contact_phone: phone || null,
      is_decision_maker: false,
      principal_name: principalName,
      principal_email: principalEmail,
      signer_name: text(formData, "signer_name") || null,
      signer_email:
        text(formData, "signer_email", 254).toLowerCase() || null,
      billing_email: null,
      grade_levels: gradeLevels,
      estimated_student_count: null,
      desired_start_term: desiredStartTerm,
      // Retained for compatibility with the existing non-null database column.
      // This value is not collected from or shown to the applicant.
      funding_status: "not_collected",
      referral_source:
        text(formData, "referral_source") || null,
      notes: text(formData, "notes", 2000) || null,
      consent_to_contact: consentToContact,
      source: text(formData, "source", 80) || "direct",
      assigned_to: rpmProfile?.id ?? null,
      pipeline_stage: "interest_received",
      next_action: "Send or retry scheduling email",
    })
    .select("id")
    .single();

  if (error || !submission) {
    console.error("Could not save school interest submission", {
      message: error?.message,
    });

    return {
      status: "error",
      message:
        "We could not submit the form. Please try again in a moment.",
    };
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://lia-portal-seven.vercel.app"
  ).replace(/\/$/, "");

  const programOverviewUrl =
    `${appUrl}/onboarding-assets/lia-program-overview.pdf`;
  const whoWeAreUrl =
    `${appUrl}/onboarding-assets/lia-who-we-are.pdf`;

  const subject = "Schedule your Latinos In Action introduction";

  console.info("Sending school interest scheduling email", {
    submissionId: submission.id,
    recipient: email,
    assignedRpm: rpm.email,
  });

  const emailResult = await sendEmail({
    to: email,
    subject,
    idempotencyKey: `school-interest-scheduling-${submission.id}`,
    attachments: [
      {
        filename: "Latinos In Action Program Overview.pdf",
        path: programOverviewUrl,
      },
      {
        filename: "LIA Who We Are.pdf",
        path: whoWeAreUrl,
      },
    ],
    html: renderBrandedEmail({
      preheader:
        "Thank you for your interest in bringing Latinos In Action to your school.",
      eyebrow: "School onboarding",
      title: "Let’s schedule your introduction",
      body: `
        <p style="margin:0; color:#3f3f46; font-size:15px; line-height:1.7;">
          Hi ${escapeHtml(firstName)},
        </p>

        <p style="margin:16px 0 0; color:#3f3f46; font-size:15px; line-height:1.7;">
          Thank you for your interest in bringing Latinos In Action to
          ${escapeHtml(schoolName)}. Your Regional Program Manager is
          ${escapeHtml(rpm.name)}.
        </p>

        <p style="margin:16px 0 0; color:#3f3f46; font-size:15px; line-height:1.7;">
          Please use the button below to schedule an introductory meeting.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
          <tr>
            <td style="border-radius:6px; background-color:#c4122f;">
              <a
                href="${rpm.calendarUrl}"
                style="display:inline-block; padding:13px 22px; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;"
              >
                Schedule a Meeting
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 0; color:#3f3f46; font-size:15px; line-height:1.7;">
          We have attached our Program Overview and Who We Are documents.
          If your email provider removes the attachments, you can download
          them here:
        </p>

        <ul style="margin:12px 0 0; padding-left:22px; color:#3f3f46; font-size:15px; line-height:1.8;">
          <li><a href="${programOverviewUrl}" style="color:#c4122f;">Program Overview</a></li>
          <li><a href="${whoWeAreUrl}" style="color:#c4122f;">Who We Are</a></li>
        </ul>

        <p style="margin:20px 0 0; color:#71717a; font-size:13px; line-height:1.6;">
          If you have questions, contact ${escapeHtml(rpm.name)} at
          <a href="mailto:${rpm.email}" style="color:#c4122f;">
            ${escapeHtml(rpm.email)}
          </a>.
        </p>
      `,
    }),
  });

  await supabase.from("email_deliveries").insert({
    resend_email_id: emailResult.id,
    recipient: email,
    subject,
    email_kind: "school_onboarding_scheduling",
    status: emailResult.error ? "failed" : "sent",
    status_message: emailResult.error,
    event_at: new Date().toISOString(),
  });

  const reviewUrl = `${appUrl}/onboarding/${submission.id}`;
  const internalSubject = `New school interest: ${schoolName.replace(/[\r\n]+/g, " ")}`;

  console.info("Sending school interest RPM notification", {
    submissionId: submission.id,
    recipient: rpm.email,
    assignedRpm: rpm.email,
  });

  const rpmEmailResult = await sendEmail({
    to: rpm.email,
    subject: internalSubject,
    idempotencyKey: `school-interest-rpm-notification-${submission.id}`,
    html: renderBrandedEmail({
      preheader: `${schoolName} submitted a school interest form.`,
      eyebrow: "New school interest",
      title: `${schoolName} is interested in LIA`,
      body: `
        <p style="margin:0; color:#3f3f46; font-size:15px; line-height:1.7;">
          Hi ${escapeHtml(rpm.name.split(" ")[0])},
        </p>

        <p style="margin:16px 0 0; color:#3f3f46; font-size:15px; line-height:1.7;">
          A new school interest form has been assigned to you.
          ${
            emailResult.error
              ? "The applicant scheduling email did not send, so manual follow-up is needed."
              : "The applicant received your scheduling link and should be scheduling an introductory meeting soon."
          }
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin-top:24px; background:#fafafa; border:1px solid #e4e4e7; border-radius:6px;">
          <tr><td style="padding:18px; color:#3f3f46; font-size:14px; line-height:1.8;">
            <strong>School:</strong> ${escapeHtml(schoolName)}<br>
            <strong>District:</strong> ${escapeHtml(districtName || "Not provided")}<br>
            <strong>Location:</strong> ${escapeHtml([region, state].filter(Boolean).join(", "))}<br>
            <strong>Applicant:</strong> ${escapeHtml(`${firstName} ${lastName}`)}<br>
            <strong>Title:</strong> ${escapeHtml(title)}<br>
            <strong>Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#c4122f;">${escapeHtml(email)}</a><br>
            <strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}<br>
            <strong>Desired start:</strong> ${escapeHtml(desiredStartTerm)}<br>
            <strong>School level:</strong> ${escapeHtml(gradeLevels.join(", "))}
          </td></tr>
        </table>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
          <tr>
            <td style="border-radius:6px; background-color:#c4122f;">
              <a href="${reviewUrl}" style="display:inline-block; padding:13px 22px; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">
                Review Submission
              </a>
            </td>
          </tr>
        </table>
      `,
    }),
  });

  await supabase.from("email_deliveries").insert({
    resend_email_id: rpmEmailResult.id,
    recipient: rpm.email,
    subject: internalSubject,
    email_kind: "school_onboarding_rpm_notification",
    status: rpmEmailResult.error ? "failed" : "sent",
    status_message: rpmEmailResult.error,
    event_at: new Date().toISOString(),
  });

  const { error: workflowError } = await supabase
    .from("school_interest_submissions")
    .update(
      emailResult.error
        ? {
            next_action: "Retry scheduling email",
            updated_at: new Date().toISOString(),
          }
        : rpmEmailResult.error
          ? {
              pipeline_stage: "launch_meeting",
              next_action: "Applicant schedules meeting; notify assigned RPM manually",
              updated_at: new Date().toISOString(),
            }
          : {
            pipeline_stage: "launch_meeting",
            next_action: "Applicant schedules introductory meeting",
            updated_at: new Date().toISOString(),
          },
    )
    .eq("id", submission.id);

  if (workflowError) {
    console.error("Could not update onboarding email status", {
      submissionId: submission.id,
      message: workflowError.message,
    });
  }

  return {
    status: "success",
    message:
      "Thank you! Check your email for program information and a link to schedule your introductory meeting.",
  };
}

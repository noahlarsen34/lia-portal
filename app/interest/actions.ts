"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export type InterestFormState = {
  status: "idle" | "error" | "success";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_FUNDING_STATUSES = new Set([
  "identified",
  "exploring",
  "needs_support",
  "unknown",
]);

function text(formData: FormData, name: string, maxLength = 250) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

export async function submitSchoolInterest(
  _previousState: InterestFormState,
  formData: FormData,
): Promise<InterestFormState> {
  // Honeypot: real visitors never see or fill this field.
  if (text(formData, "company_fax")) {
    return { status: "success", message: "Thank you. Your interest form was received." };
  }

  const schoolName = text(formData, "school_name");
  const city = text(formData, "city", 120);
  const state = text(formData, "state", 2).toUpperCase();
  const firstName = text(formData, "contact_first_name", 100);
  const lastName = text(formData, "contact_last_name", 100);
  const title = text(formData, "contact_title", 150);
  const email = text(formData, "contact_email", 254).toLowerCase();
  const desiredStartTerm = text(formData, "desired_start_term", 100);
  const fundingStatus = text(formData, "funding_status", 40);
  const consentToContact = formData.get("consent_to_contact") === "yes";
  const estimatedStudentCountRaw = text(formData, "estimated_student_count", 8);
  const estimatedStudentCount = estimatedStudentCountRaw
    ? Number.parseInt(estimatedStudentCountRaw, 10)
    : null;
  const gradeLevels = formData
    .getAll("grade_levels")
    .map(String)
    .filter((value) => /^(6|7|8|9|10|11|12)$/.test(value));

  if (
    !schoolName ||
    !city ||
    !/^[A-Z]{2}$/.test(state) ||
    !firstName ||
    !lastName ||
    !title ||
    !EMAIL_PATTERN.test(email) ||
    !desiredStartTerm ||
    !VALID_FUNDING_STATUSES.has(fundingStatus) ||
    gradeLevels.length === 0 ||
    !consentToContact
  ) {
    return {
      status: "error",
      message: "Please complete every required field and confirm we may contact you.",
    };
  }

  if (
    estimatedStudentCount !== null &&
    (!Number.isFinite(estimatedStudentCount) || estimatedStudentCount < 1 || estimatedStudentCount > 10000)
  ) {
    return { status: "error", message: "Enter a valid estimated student count." };
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
    return {
      status: "success",
      message: "Thank you. We already received this interest form and will be in touch.",
    };
  }

  const { error } = await supabase.from("school_interest_submissions").insert({
    school_name: schoolName,
    district_name: text(formData, "district_name") || null,
    city,
    state,
    website: text(formData, "website", 500) || null,
    contact_first_name: firstName,
    contact_last_name: lastName,
    contact_title: title,
    contact_email: email,
    contact_phone: text(formData, "contact_phone", 40) || null,
    is_decision_maker: formData.get("is_decision_maker") === "yes",
    signer_name: text(formData, "signer_name") || null,
    signer_email: text(formData, "signer_email", 254).toLowerCase() || null,
    billing_email: text(formData, "billing_email", 254).toLowerCase() || null,
    grade_levels: gradeLevels,
    estimated_student_count: estimatedStudentCount,
    desired_start_term: desiredStartTerm,
    funding_status: fundingStatus,
    referral_source: text(formData, "referral_source") || null,
    notes: text(formData, "notes", 2000) || null,
    consent_to_contact: consentToContact,
    source: text(formData, "source", 80) || "direct",
  });

  if (error) {
    console.error("Could not save school interest submission", { message: error.message });
    return {
      status: "error",
      message: "We could not submit the form. Please try again in a moment.",
    };
  }

  return {
    status: "success",
    message: "Thank you! Our team will review your information and contact you with the next step.",
  };
}

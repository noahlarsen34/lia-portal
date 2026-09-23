"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";
import { getStateCode } from "@/utils/us-states";
import { deriveMouSchoolYears } from "@/utils/mou";

function getText(formData: FormData, name: string, maximum = 300) {
  return String(formData.get(name) ?? "").trim().slice(0, maximum);
}

function getDiscount(formData: FormData, name: string) {
  const raw = getText(formData, name, 30);
  if (raw === "") return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : Number.NaN;
}

export async function saveMouDraft(submissionId: string, formData: FormData) {
  const { supabase, profile } = await requireStaff();

  const [{ data: submission }, { data: existingDraft }] = await Promise.all([
    supabase
      .from("school_interest_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle(),
    supabase
      .from("school_mou_drafts")
      .select("id, status, revision")
      .eq("interest_submission_id", submissionId)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  if (!submission) redirect("/onboarding");
  if (!submission.launch_meeting_completed_at) {
    redirect(`/onboarding/${submissionId}?error=complete-meeting-first`);
  }
  if (existingDraft && existingDraft.status !== "draft") {
    redirect(`/onboarding/${submissionId}/mou?error=draft-locked`);
  }

  const stateCode = getStateCode(submission.state);
  if (!stateCode) redirect(`/onboarding/${submissionId}/mou?error=invalid-state`);

  const { data: pricing } = await supabase
    .from("mou_state_pricing")
    .select("*")
    .eq("state_code", stateCode)
    .eq("program_level", "middle_high")
    .eq("is_active", true)
    .order("effective_school_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pricing) redirect(`/onboarding/${submissionId}/mou?error=pricing-missing`);

  const launchDiscountName = getText(formData, "launch_discount_name");
  const renewalDiscountName = getText(formData, "renewal_discount_name");
  const launchDiscountAmount = getDiscount(formData, "launch_discount_amount");
  const renewalDiscountAmount = getDiscount(formData, "renewal_discount_amount");
  const launchBasePrice = Number(pricing.launch_base_price);
  const renewalBasePrice = Number(pricing.renewal_base_price);

  const invalidDiscount =
    !Number.isFinite(launchDiscountAmount) ||
    !Number.isFinite(renewalDiscountAmount) ||
    launchDiscountAmount < 0 ||
    renewalDiscountAmount < 0 ||
    launchDiscountAmount > launchBasePrice ||
    renewalDiscountAmount > renewalBasePrice ||
    (launchDiscountAmount > 0 && !launchDiscountName) ||
    (renewalDiscountAmount > 0 && !renewalDiscountName);

  if (invalidDiscount) {
    redirect(`/onboarding/${submissionId}/mou?error=invalid-discount`);
  }

  const years = deriveMouSchoolYears(
    submission.desired_start_term,
    pricing.effective_school_year,
  );
  const now = new Date().toISOString();
  const draftSnapshot = {
    pricing_id: pricing.id,
    contracting_party_name: submission.district_name?.trim() || submission.school_name,
    school_name: submission.school_name,
    district_name: submission.district_name || null,
    state_code: stateCode,
    program_level: "middle_high",
    authorized_signer_name: submission.signer_name || null,
    authorized_signer_email: submission.signer_email || null,
    billing_email: submission.billing_email || null,
    effective_school_year: years.effectiveSchoolYear,
    launch_school_year: years.launchSchoolYear,
    renewal_school_year: years.renewalSchoolYear,
    launch_base_price: launchBasePrice,
    launch_discount_name: launchDiscountAmount > 0 ? launchDiscountName : null,
    launch_discount_amount: launchDiscountAmount,
    renewal_base_price: renewalBasePrice,
    renewal_discount_name: renewalDiscountAmount > 0 ? renewalDiscountName : null,
    renewal_discount_amount: renewalDiscountAmount,
    updated_by: profile.id,
    updated_at: now,
  };

  const result = existingDraft
    ? await supabase
        .from("school_mou_drafts")
        .update(draftSnapshot)
        .eq("id", existingDraft.id)
    : await supabase.from("school_mou_drafts").insert({
        ...draftSnapshot,
        interest_submission_id: submissionId,
        revision: 1,
        is_current: true,
        status: "draft",
        created_by: profile.id,
      });

  if (result.error) {
    console.error("Could not save MOU draft", {
      submissionId,
      message: result.error.message,
    });
    redirect(`/onboarding/${submissionId}/mou?error=save-failed`);
  }

  revalidatePath(`/onboarding/${submissionId}`);
  revalidatePath(`/onboarding/${submissionId}/mou`);
  redirect(`/onboarding/${submissionId}/mou?saved=true`);
}

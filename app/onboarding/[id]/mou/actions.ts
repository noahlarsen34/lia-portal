"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  createMouSignatureEnvelope,
  getDocusignEnvelopeStatus,
  isDocusignSendingEnabled,
} from "@/utils/docusign";
import { completeMouFromDocusign } from "@/utils/mou-signature";
import { getStateCode } from "@/utils/us-states";
import {
  calculatePercentageDiscount,
  deriveMouSchoolYears,
  MOU_STANDARD_PRICING,
} from "@/utils/mou";
import {
  generateFinalizedMouDocx,
  getMouDocumentPath,
  MOU_DOCUMENT_BUCKET,
  MOU_DOCUMENT_CONTENT_TYPE,
} from "@/utils/mou-document";

function getText(formData: FormData, name: string, maximum = 300) {
  return String(formData.get(name) ?? "").trim().slice(0, maximum);
}

function getPercentage(formData: FormData, name: string) {
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

  const startupDiscountName = getText(formData, "startup_discount_name");
  const firstYearDiscountName = getText(formData, "first_year_discount_name");
  const renewalDiscountName = getText(formData, "renewal_discount_name");
  const startupDiscountPercent = getPercentage(formData, "startup_discount_percent");
  const firstYearDiscountPercent = getPercentage(formData, "first_year_discount_percent");
  const renewalDiscountPercent = getPercentage(formData, "renewal_discount_percent");
  const startupBasePrice = MOU_STANDARD_PRICING.startupTotal;
  const firstYearBasePrice = MOU_STANDARD_PRICING.firstYearTotal;
  const renewalBasePrice = MOU_STANDARD_PRICING.renewalTotal;
  const startupDiscountAmount = calculatePercentageDiscount(
    startupBasePrice,
    startupDiscountPercent,
  );
  const firstYearDiscountAmount = calculatePercentageDiscount(
    firstYearBasePrice,
    firstYearDiscountPercent,
  );
  const renewalDiscountAmount = calculatePercentageDiscount(
    renewalBasePrice,
    renewalDiscountPercent,
  );
  const launchBasePrice = startupBasePrice + firstYearBasePrice;
  const launchDiscountAmount = startupDiscountAmount + firstYearDiscountAmount;
  const launchDiscountName = [startupDiscountName, firstYearDiscountName]
    .filter(Boolean)
    .join("; ")
    .slice(0, 300);

  const invalidDiscount =
    !Number.isFinite(startupDiscountPercent) ||
    !Number.isFinite(firstYearDiscountPercent) ||
    !Number.isFinite(renewalDiscountPercent) ||
    startupDiscountPercent < 0 || startupDiscountPercent > 100 ||
    firstYearDiscountPercent < 0 || firstYearDiscountPercent > 100 ||
    renewalDiscountPercent < 0 || renewalDiscountPercent > 100 ||
    (startupDiscountPercent > 0 && !startupDiscountName) ||
    (firstYearDiscountPercent > 0 && !firstYearDiscountName) ||
    (renewalDiscountPercent > 0 && !renewalDiscountName);

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
    startup_base_price: startupBasePrice,
    startup_discount_name: startupDiscountPercent > 0 ? startupDiscountName : null,
    startup_discount_percent: startupDiscountPercent,
    startup_discount_amount: startupDiscountAmount,
    startup_final_price: startupBasePrice - startupDiscountAmount,
    first_year_base_price: firstYearBasePrice,
    first_year_discount_name: firstYearDiscountPercent > 0 ? firstYearDiscountName : null,
    first_year_discount_percent: firstYearDiscountPercent,
    first_year_discount_amount: firstYearDiscountAmount,
    first_year_final_price: firstYearBasePrice - firstYearDiscountAmount,
    renewal_base_price: renewalBasePrice,
    renewal_discount_name: renewalDiscountAmount > 0 ? renewalDiscountName : null,
    renewal_discount_amount: renewalDiscountAmount,
    renewal_program_base_price: renewalBasePrice,
    renewal_discount_percent: renewalDiscountPercent,
    renewal_program_final_price: renewalBasePrice - renewalDiscountAmount,
    document_storage_bucket: null,
    document_storage_path: null,
    generated_at: null,
    updated_by: profile.id,
    updated_at: now,
  };

  const result = existingDraft
    ? await supabase
        .from("school_mou_drafts")
        .update(draftSnapshot)
        .eq("id", existingDraft.id)
        .select("id, revision")
        .single()
    : await supabase.from("school_mou_drafts").insert({
        ...draftSnapshot,
        interest_submission_id: submissionId,
        revision: 1,
        is_current: true,
        status: "draft",
        created_by: profile.id,
      })
        .select("id, revision")
        .single();

  if (result.error) {
    console.error("Could not save MOU draft", {
      submissionId,
      message: result.error.message,
    });
    redirect(`/onboarding/${submissionId}/mou?error=save-failed`);
  }

  const generatedAt = new Date().toISOString();
  const documentPath = getMouDocumentPath(
    submissionId,
    Number(result.data.revision),
  );

  let finalizedDocument: Buffer;
  try {
    finalizedDocument = await generateFinalizedMouDocx({
      contractingPartyName: draftSnapshot.contracting_party_name,
      schoolName: draftSnapshot.school_name,
      authorizedSignerName: draftSnapshot.authorized_signer_name,
      effectiveSchoolYear: draftSnapshot.effective_school_year,
      launchSchoolYear: draftSnapshot.launch_school_year,
      renewalSchoolYear: draftSnapshot.renewal_school_year,
      liaSignatureDate: null,
      startupDiscountName: draftSnapshot.startup_discount_name,
      startupDiscountPercent,
      startupDiscountAmount,
      startupFinalPrice: draftSnapshot.startup_final_price,
      firstYearDiscountName: draftSnapshot.first_year_discount_name,
      firstYearDiscountPercent,
      firstYearDiscountAmount,
      firstYearFinalPrice: draftSnapshot.first_year_final_price,
      firstYearGrandTotal:
        draftSnapshot.startup_final_price + draftSnapshot.first_year_final_price,
      renewalDiscountName: draftSnapshot.renewal_discount_name,
      renewalDiscountPercent,
      renewalDiscountAmount,
      renewalProgramFinalPrice: draftSnapshot.renewal_program_final_price,
    });
  } catch (generationError) {
    console.error("Could not generate finalized MOU", {
      submissionId,
      message:
        generationError instanceof Error
          ? generationError.message
          : "Unknown document generation error",
    });
    redirect(`/onboarding/${submissionId}/mou?saved=true&error=generation-failed`);
  }

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(MOU_DOCUMENT_BUCKET)
    .upload(documentPath, finalizedDocument, {
      contentType: MOU_DOCUMENT_CONTENT_TYPE,
      cacheControl: "no-cache",
      upsert: true,
    });

  if (uploadError) {
    console.error("Could not upload finalized MOU", {
      submissionId,
      documentPath,
      message: uploadError.message,
    });
    redirect(`/onboarding/${submissionId}/mou?saved=true&error=document-upload-failed`);
  }

  const { error: documentUpdateError } = await supabase
    .from("school_mou_drafts")
    .update({
      document_storage_bucket: MOU_DOCUMENT_BUCKET,
      document_storage_path: documentPath,
      generated_at: generatedAt,
    })
    .eq("id", result.data.id);

  if (documentUpdateError) {
    await admin.storage.from(MOU_DOCUMENT_BUCKET).remove([documentPath]);
    console.error("Could not attach finalized MOU to draft", {
      submissionId,
      documentPath,
      message: documentUpdateError.message,
    });
    redirect(`/onboarding/${submissionId}/mou?saved=true&error=document-save-failed`);
  }

  revalidatePath(`/onboarding/${submissionId}`);
  revalidatePath(`/onboarding/${submissionId}/mou`);
  redirect(
    `/onboarding/${submissionId}/mou?saved=true&generated=true&updated=${existingDraft ? "true" : "false"}`,
  );
}

export async function approveMouForSending(submissionId: string) {
  const { supabase, profile } = await requireStaff();
  const { data: draft } = await supabase
    .from("school_mou_drafts")
    .select("id, status, document_storage_path, generated_at")
    .eq("interest_submission_id", submissionId)
    .eq("is_current", true)
    .maybeSingle();

  if (!draft?.document_storage_path || !draft.generated_at) {
    redirect(`/onboarding/${submissionId}/mou?error=document-required`);
  }
  if (draft.status === "ready_to_send") {
    redirect(`/onboarding/${submissionId}/mou?approved=true`);
  }
  if (draft.status !== "draft") {
    redirect(`/onboarding/${submissionId}/mou?error=draft-locked`);
  }

  const { data: approvedDraft, error } = await supabase
    .from("school_mou_drafts")
    .update({
      status: "ready_to_send",
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draft.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error || !approvedDraft) {
    console.error("Could not approve MOU for sending", {
      submissionId,
      message: error?.message ?? "The draft was modified before approval.",
    });
    redirect(`/onboarding/${submissionId}/mou?error=approval-failed`);
  }

  revalidatePath(`/onboarding/${submissionId}`);
  revalidatePath(`/onboarding/${submissionId}/mou`);
  revalidatePath(`/onboarding/${submissionId}/mou/preview`);
  redirect(`/onboarding/${submissionId}/mou?approved=true`);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function sendApprovedMou(submissionId: string, formData: FormData) {
  const { supabase, profile } = await requireStaff();

  if (!isDocusignSendingEnabled()) {
    redirect(`/onboarding/${submissionId}/mou/send?error=docusign-not-active`);
  }

  const recipientEmail = getText(formData, "recipient_email", 320).toLowerCase();
  const subject = getText(formData, "email_subject", 300).replace(/[\r\n]+/g, " ");
  const message = getText(formData, "email_message", 5000);
  const confirmed = getText(formData, "locked_document_confirmed", 10) === "yes";

  if (!isValidEmail(recipientEmail) || !subject || !message || !confirmed) {
    redirect(`/onboarding/${submissionId}/mou/send?error=send-invalid`);
  }

  const [{ data: submission }, { data: draft }] = await Promise.all([
    supabase
      .from("school_interest_submissions")
      .select("id, school_name")
      .eq("id", submissionId)
      .maybeSingle(),
    supabase
      .from("school_mou_drafts")
      .select("id, revision, status, school_name, authorized_signer_name, docusign_envelope_id, document_storage_bucket, document_storage_path")
      .eq("interest_submission_id", submissionId)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  if (!submission || !draft) redirect("/onboarding");
  if (draft.docusign_envelope_id) redirect(`/onboarding/${submissionId}/mou/send?sent=true`);
  if (
    !["ready_to_send", "sent"].includes(draft.status) ||
    !draft.document_storage_bucket ||
    !draft.document_storage_path
  ) {
    redirect(`/onboarding/${submissionId}/mou?error=document-required`);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const sendSnapshot = {
    mou_draft_id: draft.id,
    interest_submission_id: submissionId,
    document_revision: draft.revision,
    document_storage_bucket: draft.document_storage_bucket,
    document_storage_path: draft.document_storage_path,
    recipient_name: draft.authorized_signer_name || null,
    recipient_email: recipientEmail,
    email_subject: subject,
    email_message: message,
    delivery_status: "requested",
    status_message: null,
    requested_by: profile.id,
    requested_at: now,
    event_at: now,
  };

  const { data: existingSend, error: existingSendError } = await admin
    .from("mou_send_events")
    .select("id, delivery_status, sent_at")
    .eq("mou_draft_id", draft.id)
    .maybeSingle();

  if (existingSendError) {
    console.error("Could not inspect MOU send state", { submissionId, message: existingSendError.message });
    redirect(`/onboarding/${submissionId}/mou/send?error=send-setup-required`);
  }
  if (existingSend?.delivery_status === "requested" && !existingSend.sent_at) {
    redirect(`/onboarding/${submissionId}/mou/send?error=send-in-progress`);
  }

  const sendRecordResult = existingSend
    ? await admin.from("mou_send_events").update(sendSnapshot).eq("id", existingSend.id).select("id").single()
    : await admin.from("mou_send_events").insert(sendSnapshot).select("id").single();

  if (sendRecordResult.error) {
    console.error("Could not reserve MOU send", { submissionId, message: sendRecordResult.error.message });
    redirect(`/onboarding/${submissionId}/mou/send?error=${sendRecordResult.error.code === "42P01" ? "send-setup-required" : "send-in-progress"}`);
  }

  const { data: document, error: documentError } = await admin.storage
    .from(draft.document_storage_bucket)
    .download(draft.document_storage_path);

  if (documentError || !document) {
    const statusMessage = documentError?.message ?? "The locked document could not be loaded.";
    await admin.from("mou_send_events").update({ delivery_status: "failed", status_message: statusMessage, event_at: new Date().toISOString() }).eq("id", sendRecordResult.data.id);
    console.error("Could not load locked MOU for email", { submissionId, message: statusMessage });
    redirect(`/onboarding/${submissionId}/mou/send?error=send-failed`);
  }

  const eventAt = new Date().toISOString();
  const safeSchoolName = draft.school_name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "school";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const webhookUrl = appUrl && /^https:\/\//i.test(appUrl) && !/localhost|127\.0\.0\.1/i.test(appUrl)
    ? `${appUrl}/api/webhooks/docusign`
    : undefined;

  let envelope: Awaited<ReturnType<typeof createMouSignatureEnvelope>>;
  try {
    envelope = await createMouSignatureEnvelope({
      document: Buffer.from(await document.arrayBuffer()),
      draftId: draft.id,
      emailMessage: message,
      emailSubject: subject,
      fileName: `${safeSchoolName}-mou-revision-${draft.revision}.docx`,
      signerEmail: recipientEmail,
      signerName: draft.authorized_signer_name || "Authorized Representative",
      webhookUrl,
    });
  } catch (error) {
    const statusMessage = error instanceof Error ? error.message : "DocuSign could not create the envelope.";
    await admin.from("mou_send_events").update({
      delivery_status: "failed",
      status_message: statusMessage,
      event_at: eventAt,
    }).eq("id", sendRecordResult.data.id);
    console.error("DocuSign MOU send failed", { submissionId, message: statusMessage });
    redirect(`/onboarding/${submissionId}/mou/send?error=send-failed`);
  }

  const sendUpdate = await admin.from("mou_send_events").update({
      delivery_status: "sent",
      status_message: null,
      sent_at: eventAt,
      event_at: eventAt,
    }).eq("id", sendRecordResult.data.id);

  if (sendUpdate.error) {
    console.error("DocuSign email accepted but its send state could not be saved", {
      submissionId,
      envelopeId: envelope.envelopeId,
      message: sendUpdate.error.message,
    });
    redirect(`/onboarding/${submissionId}/mou/send?error=send-save-failed`);
  }

  const [draftUpdate, submissionUpdate] = await Promise.all([
    admin.from("school_mou_drafts").update({
      status: "sent",
      sent_to_email: recipientEmail,
      sent_at: eventAt,
      docusign_envelope_id: envelope.envelopeId,
      docusign_status: envelope.status,
      docusign_status_updated_at: envelope.statusDateTime,
      updated_by: profile.id,
    }).eq("id", draft.id).in("status", ["ready_to_send", "sent"]),
    admin.from("school_interest_submissions").update({
      pipeline_stage: "awaiting_school_signature",
      next_action: "Await authorized signer response",
      updated_at: eventAt,
    }).eq("id", submissionId),
  ]);

  if (draftUpdate.error || submissionUpdate.error) {
    console.error("MOU sent but final state could not be fully saved", {
      submissionId,
      draftError: draftUpdate.error?.message,
      submissionError: submissionUpdate.error?.message,
    });
    redirect(`/onboarding/${submissionId}/mou/send?error=send-save-failed`);
  }
  revalidatePath("/onboarding");
  revalidatePath(`/onboarding/${submissionId}`);
  revalidatePath(`/onboarding/${submissionId}/mou`);
  revalidatePath(`/onboarding/${submissionId}/mou/send`);
  redirect(`/onboarding/${submissionId}/mou/send?sent=true`);
}

export async function refreshMouSignatureStatus(submissionId: string) {
  const { supabase } = await requireStaff();
  const { data: draft } = await supabase
    .from("school_mou_drafts")
    .select("id, docusign_envelope_id")
    .eq("interest_submission_id", submissionId)
    .eq("is_current", true)
    .maybeSingle();

  if (!draft?.docusign_envelope_id) {
    redirect(`/onboarding/${submissionId}/mou/send?error=docusign-envelope-missing`);
  }

  let envelope;
  try {
    envelope = await getDocusignEnvelopeStatus(draft.docusign_envelope_id);
  } catch (error) {
    console.error("Could not refresh DocuSign envelope", {
      submissionId,
      message: error instanceof Error ? error.message : "Unknown DocuSign status error",
    });
    redirect(`/onboarding/${submissionId}/mou/send?error=docusign-refresh-failed`);
  }

  const statusAt = envelope.statusChangedDateTime || new Date().toISOString();
  const admin = createAdminClient();
  await admin.from("school_mou_drafts").update({
    docusign_status: envelope.status,
    docusign_status_updated_at: statusAt,
    void_reason: envelope.voidedReason || null,
  }).eq("id", draft.id);

  if (envelope.status === "completed") {
    try {
      await completeMouFromDocusign(
        draft.docusign_envelope_id,
        envelope.completedDateTime || statusAt,
      );
    } catch (error) {
      console.error("Could not process completed DocuSign MOU", {
        submissionId,
        message: error instanceof Error ? error.message : "Unknown completion error",
      });
      redirect(`/onboarding/${submissionId}/mou/send?error=docusign-completion-failed`);
    }
  }

  revalidatePath("/onboarding");
  revalidatePath(`/onboarding/${submissionId}`);
  revalidatePath(`/onboarding/${submissionId}/mou`);
  revalidatePath(`/onboarding/${submissionId}/mou/send`);
  redirect(`/onboarding/${submissionId}/mou/send?refreshed=true`);
}

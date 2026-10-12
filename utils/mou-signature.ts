import "server-only";

import { escapeHtml, renderBrandedEmail, sendEmail } from "@/utils/email";
import { downloadDocusignDocument } from "@/utils/docusign";
import { MOU_DOCUMENT_BUCKET } from "@/utils/mou-document";
import { createAdminClient } from "@/utils/supabase/admin";

const PDF_CONTENT_TYPE = "application/pdf";
const SCHOOL_DOCUMENT_BUCKET = "school-documents";

export async function completeMouFromDocusign(
  envelopeId: string,
  completedAt = new Date().toISOString(),
) {
  const admin = createAdminClient();
  const { data: draft, error: draftError } = await admin
    .from("school_mou_drafts")
    .select("id, interest_submission_id, revision, school_name, signed_at, updated_by")
    .eq("docusign_envelope_id", envelopeId)
    .maybeSingle();

  if (draftError || !draft) {
    throw new Error(draftError?.message || "No MOU draft matches this DocuSign envelope.");
  }
  if (draft.signed_at) return { alreadyCompleted: true, submissionId: draft.interest_submission_id };

  const [executedPdf, certificatePdf] = await Promise.all([
    downloadDocusignDocument(envelopeId, "combined"),
    downloadDocusignDocument(envelopeId, "certificate"),
  ]);
  const basePath = `${draft.interest_submission_id}/revision-${draft.revision}`;
  const executedPath = `${basePath}/executed-mou.pdf`;
  const certificatePath = `${basePath}/certificate-of-completion.pdf`;

  const [executedUpload, certificateUpload] = await Promise.all([
    admin.storage.from(MOU_DOCUMENT_BUCKET).upload(executedPath, executedPdf, {
      contentType: PDF_CONTENT_TYPE,
      cacheControl: "no-cache",
      upsert: true,
    }),
    admin.storage.from(MOU_DOCUMENT_BUCKET).upload(certificatePath, certificatePdf, {
      contentType: PDF_CONTENT_TYPE,
      cacheControl: "no-cache",
      upsert: true,
    }),
  ]);

  if (executedUpload.error || certificateUpload.error) {
    throw new Error(
      executedUpload.error?.message || certificateUpload.error?.message || "The executed MOU could not be stored.",
    );
  }

  const { data: completedDraft, error: completionError } = await admin
    .from("school_mou_drafts")
    .update({
      status: "signed",
      docusign_status: "completed",
      docusign_status_updated_at: completedAt,
      signed_at: completedAt,
      executed_document_storage_bucket: MOU_DOCUMENT_BUCKET,
      executed_document_storage_path: executedPath,
      certificate_storage_bucket: MOU_DOCUMENT_BUCKET,
      certificate_storage_path: certificatePath,
    })
    .eq("id", draft.id)
    .is("signed_at", null)
    .select("id")
    .maybeSingle();

  if (completionError) throw new Error(completionError.message);
  if (!completedDraft) return { alreadyCompleted: true, submissionId: draft.interest_submission_id };

  const { error: historyError } = await admin.from("mou_document_history").upsert([
    {
      mou_draft_id: draft.id,
      interest_submission_id: draft.interest_submission_id,
      document_revision: draft.revision,
      document_kind: "executed",
      storage_bucket: MOU_DOCUMENT_BUCKET,
      storage_path: executedPath,
      content_type: PDF_CONTENT_TYPE,
      docusign_envelope_id: envelopeId,
    },
    {
      mou_draft_id: draft.id,
      interest_submission_id: draft.interest_submission_id,
      document_revision: draft.revision,
      document_kind: "certificate",
      storage_bucket: MOU_DOCUMENT_BUCKET,
      storage_path: certificatePath,
      content_type: PDF_CONTENT_TYPE,
      docusign_envelope_id: envelopeId,
    },
  ], { onConflict: "mou_draft_id,document_kind" });

  if (historyError) {
    console.error("Could not add executed MOU history", {
      envelopeId,
      message: historyError.message,
    });
  }

  const { data: submission, error: submissionError } = await admin
    .from("school_interest_submissions")
    .update({
      pipeline_stage: "mou_signed",
      next_action: "Begin school onboarding",
      updated_at: completedAt,
    })
    .eq("id", draft.interest_submission_id)
    .select("school_name, assigned_to, converted_school_id")
    .single();

  if (submissionError) throw new Error(submissionError.message);

  if (submission.converted_school_id) {
    const schoolDocumentPath = `${submission.converted_school_id}/mou-${draft.id}-executed.pdf`;
    const { error: schoolUploadError } = await admin.storage
      .from(SCHOOL_DOCUMENT_BUCKET)
      .upload(schoolDocumentPath, executedPdf, {
        contentType: PDF_CONTENT_TYPE,
        cacheControl: "3600",
        upsert: true,
      });

    if (!schoolUploadError) {
      const { data: existingDocument } = await admin
        .from("documents")
        .select("id")
        .eq("school_id", submission.converted_school_id)
        .eq("file_url", schoolDocumentPath)
        .maybeSingle();

      if (!existingDocument) {
        const { error: documentInsertError } = await admin.from("documents").insert({
          school_id: submission.converted_school_id,
          name: `Executed MOU · ${submission.school_name}`,
          document_type: "Executed MOU",
          file_url: schoolDocumentPath,
          uploaded_by: submission.assigned_to || draft.updated_by || null,
        });
        if (documentInsertError) {
          console.error("Could not add executed MOU to school documents", {
            envelopeId,
            message: documentInsertError.message,
          });
        }
      }
    } else {
      console.error("Could not copy executed MOU to school documents", {
        envelopeId,
        message: schoolUploadError.message,
      });
    }
  }

  if (submission.assigned_to) {
    const { data: rpm } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", submission.assigned_to)
      .maybeSingle();

    if (rpm?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
      const subject = `MOU signed: ${submission.school_name}`;
      const emailResult = await sendEmail({
        to: rpm.email,
        subject,
        idempotencyKey: `mou-completed-rpm-${draft.id}`,
        html: renderBrandedEmail({
          preheader: `${submission.school_name} completed its MOU signature.`,
          eyebrow: "MOU completed",
          title: `${submission.school_name} signed the MOU`,
          body: `
            <p style="margin:0; color:#3f3f46; font-size:15px; line-height:1.7;">
              Hi ${escapeHtml(rpm.full_name?.split(" ")[0] || "there")},
            </p>
            <p style="margin:16px 0 0; color:#3f3f46; font-size:15px; line-height:1.7;">
              The authorized school representative has completed the MOU. The executed PDF is stored in the portal and the workflow is ready for onboarding.
            </p>
            ${appUrl ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(`${appUrl}/onboarding/${draft.interest_submission_id}/mou`)}" style="color:#c4122f; font-weight:700;">View signed MOU</a></p>` : ""}
          `,
        }),
      });

      await admin.from("email_deliveries").insert({
        resend_email_id: emailResult.id,
        recipient: rpm.email,
        subject,
        email_kind: "mou_signed_rpm_notification",
        status: emailResult.error ? "failed" : "sent",
        status_message: emailResult.error,
        event_at: new Date().toISOString(),
      });
    }
  }

  return { alreadyCompleted: false, submissionId: draft.interest_submission_id };
}

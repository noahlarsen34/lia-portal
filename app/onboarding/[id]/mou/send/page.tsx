import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { isDocusignSendingEnabled } from "@/utils/docusign";
import { refreshMouSignatureStatus, sendApprovedMou } from "../actions";
import { MouDocumentPreview } from "../preview/mou-document-preview";
import { SendMouButton } from "./send-mou-button";

type SendMouPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; refreshed?: string; error?: string }>;
};

const errorMessages: Record<string, string> = {
  "send-setup-required": "MOU sending is not configured yet. Run sql/mou-email-sending.sql in Supabase.",
  "docusign-not-active": "Automated signature sending is awaiting production activation.",
  "send-invalid": "Enter a valid recipient email, subject, and message, then confirm the locked document.",
  "send-in-progress": "This MOU is already being sent. Reload the page to see its current status.",
  "send-failed": "DocuSign could not send this MOU. The workflow stage was not changed; review the error below and try again.",
  "send-save-failed": "The email was accepted, but its final workflow state could not be saved. Do not send it again; contact an administrator.",
  "docusign-envelope-missing": "No DocuSign envelope is connected to this MOU.",
  "docusign-refresh-failed": "The latest status could not be retrieved from DocuSign.",
  "docusign-completion-failed": "DocuSign reports this MOU as completed, but the executed PDF could not be saved. Try refreshing again.",
};

function deliveryLabel(status: string) {
  return status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function SendMouPage({ params, searchParams }: SendMouPageProps) {
  const { id } = await params;
  const { sent, refreshed, error } = await searchParams;
  const { supabase } = await requireStaff();

  const [{ data: submission }, { data: draft }] = await Promise.all([
    supabase
      .from("school_interest_submissions")
      .select("id, school_name, pipeline_stage")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("school_mou_drafts")
      .select("id, school_name, authorized_signer_name, authorized_signer_email, revision, status, document_storage_bucket, document_storage_path, docusign_envelope_id, docusign_status, docusign_status_updated_at, executed_document_storage_path")
      .eq("interest_submission_id", id)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  if (!submission || !draft) notFound();
  if (draft.status === "draft") redirect(`/onboarding/${id}/mou?error=document-required`);
  if (!draft.document_storage_bucket || !draft.document_storage_path) {
    redirect(`/onboarding/${id}/mou?error=document-required`);
  }

  const { data: sendEvent, error: sendEventError } = await supabase
    .from("mou_send_events")
    .select("recipient_name, recipient_email, email_subject, email_message, resend_message_id, delivery_status, status_message, sent_at")
    .eq("mou_draft_id", draft.id)
    .maybeSingle();

  const setupMissing = Boolean(sendEventError);
  const alreadySent = Boolean(draft.docusign_envelope_id);
  const sendingEnabled = isDocusignSendingEnabled();
  const defaultSubject = `Latinos In Action MOU for ${draft.school_name}`;
  const defaultMessage = `Hello ${draft.authorized_signer_name || "there"},\n\nPlease review and electronically sign the Latinos In Action Memorandum of Understanding for ${draft.school_name}.\n\nThank you,\nLatinos In Action`;

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />
      <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href={`/onboarding/${id}/mou`} className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]">
            Back to MOU
          </Link>

          <div className="mt-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">Final send review</p>
            <h1 className="mt-2 text-3xl font-semibold">Send MOU · {submission.school_name}</h1>
            <p className="mt-2 text-sm text-zinc-600">Confirm the recipient, message, and locked revision before sending.</p>
          </div>

          {sent ? <p role="status" className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">DocuSign sent the signature request successfully. The school is now awaiting signature.</p> : null}
          {refreshed ? <p role="status" className="mt-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">The latest envelope status was retrieved from DocuSign.</p> : null}
          {error ? <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessages[error] ?? "The MOU could not be sent."}</p> : null}
          {setupMissing ? <p role="alert" className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run <code>sql/mou-email-sending.sql</code> in Supabase before sending an MOU.</p> : null}
          {!sendingEnabled && !alreadySent ? (
            <p role="status" className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Automated signature sending is awaiting production activation. You can review and download the finalized MOU, but no DocuSign envelope can be sent yet.
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">DocuSign email details</h2>
              {alreadySent && sendEvent ? (
                <dl className="mt-5 grid gap-4 text-sm">
                  <div><dt className="font-semibold text-zinc-700">Recipient</dt><dd className="mt-1">{sendEvent.recipient_name || "Authorized signer"} · {sendEvent.recipient_email}</dd></div>
                  <div><dt className="font-semibold text-zinc-700">Subject</dt><dd className="mt-1">{sendEvent.email_subject}</dd></div>
                  <div><dt className="font-semibold text-zinc-700">Message</dt><dd className="mt-1 whitespace-pre-wrap text-zinc-700">{sendEvent.email_message}</dd></div>
                  <div><dt className="font-semibold text-zinc-700">Sent</dt><dd className="mt-1">{sendEvent.sent_at ? new Date(sendEvent.sent_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Pending"}</dd></div>
                </dl>
              ) : (
                <form action={sendApprovedMou.bind(null, id)} className="mt-5 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="recipient_name">Recipient name</label>
                    <input id="recipient_name" value={draft.authorized_signer_name || "Authorized signer"} readOnly className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm text-zinc-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="recipient_email">Recipient email</label>
                    <input id="recipient_email" name="recipient_email" type="email" required defaultValue={sendEvent?.recipient_email || draft.authorized_signer_email || ""} className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e]" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="email_subject">Email subject</label>
                    <input id="email_subject" name="email_subject" required maxLength={300} defaultValue={sendEvent?.email_subject || defaultSubject} className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e]" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="email_message">Email message</label>
                    <textarea id="email_message" name="email_message" required maxLength={5000} rows={9} defaultValue={sendEvent?.email_message || defaultMessage} className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm leading-6 outline-none focus:border-[#c8102e]" />
                  </div>
                  <label className="flex gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-950">
                    <input type="checkbox" name="locked_document_confirmed" value="yes" required className="mt-0.5 size-4 accent-[#c8102e]" />
                    <span>I confirm revision {draft.revision} and its pricing are locked, final, and ready to send.</span>
                  </label>
                  <SendMouButton sendingEnabled={sendingEnabled} />
                </form>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-5">
                <p className="text-sm font-semibold text-green-900">Pricing locked</p>
                <p className="mt-2 text-sm leading-6 text-green-800">MOU revision {draft.revision} is approved. Sending cannot regenerate or change this document.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold">Signature status</p>
                <p className="mt-2 text-sm text-zinc-700">{draft.docusign_status ? deliveryLabel(draft.docusign_status) : "Not sent for signature"}</p>
                {draft.docusign_envelope_id ? <p className="mt-2 break-all text-xs text-zinc-500">Envelope: {draft.docusign_envelope_id}</p> : null}
                {sendEvent?.status_message ? <p role="alert" className="mt-3 text-sm text-red-700">{sendEvent.status_message}</p> : null}
                {draft.docusign_envelope_id ? (
                  <form action={refreshMouSignatureStatus.bind(null, id)} className="mt-4">
                    <button type="submit" className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-semibold hover:bg-zinc-50">Refresh from DocuSign</button>
                  </form>
                ) : null}
                {draft.executed_document_storage_path ? (
                  <a href={`/onboarding/${id}/mou/executed`} className="mt-3 inline-flex text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]">Download executed PDF</a>
                ) : null}
              </div>
            </aside>
          </div>

          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Final locked document</h2>
                <p className="mt-1 text-sm text-zinc-600">This exact locked document will be placed in the DocuSign envelope.</p>
              </div>
              <a href={`/onboarding/${id}/mou/document`} download className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-semibold hover:bg-zinc-50">Download document</a>
            </div>
            <MouDocumentPreview documentUrl={`/onboarding/${id}/mou/document`} />
          </div>
        </div>
      </section>
    </main>
  );
}

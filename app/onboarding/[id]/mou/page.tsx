import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStateCode } from "@/utils/us-states";
import { deriveMouSchoolYears, MOU_STANDARD_PRICING } from "@/utils/mou";
import { MouDraftForm } from "./mou-draft-form";
import { approveMouForSending } from "./actions";

type MouPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    generated?: string;
    updated?: string;
    approved?: string;
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "invalid-state": "The submission does not contain a valid U.S. state.",
  "pricing-missing": "Standard pricing has not been configured for this state. Add the state price before creating the MOU.",
  "invalid-discount": "Each discount must be between 0% and 100%, and discounts above 0% need a name.",
  "save-failed": "The MOU draft could not be saved. Confirm all MOU SQL migrations were run in Supabase.",
  "generation-failed": "The pricing was saved, but the finalized Word document could not be generated.",
  "document-upload-failed": "The pricing was saved, but the finalized MOU could not be uploaded. Run sql/mou-generated-documents.sql in Supabase and try again.",
  "document-save-failed": "The finalized MOU was generated, but it could not be attached to this draft.",
  "document-required": "Save the MOU draft and review the generated document before approving it.",
  "approval-failed": "The MOU could not be approved. Reload the page and try again.",
  "draft-locked": "This MOU can no longer be edited because it has moved beyond draft status.",
};

export default async function MouPage({ params, searchParams }: MouPageProps) {
  const { id } = await params;
  const { saved, generated, updated, approved, error } = await searchParams;
  const { supabase } = await requireStaff();
  const { data: submission } = await supabase
    .from("school_interest_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!submission) notFound();
  if (!submission.launch_meeting_completed_at) {
    redirect(`/onboarding/${id}?error=complete-meeting-first`);
  }

  const stateCode = getStateCode(submission.state);
  const [{ data: pricing, error: pricingError }, { data: draft, error: draftError }] = await Promise.all([
    stateCode
      ? supabase
          .from("mou_state_pricing")
          .select("*")
          .eq("state_code", stateCode)
          .eq("program_level", "middle_high")
          .eq("is_active", true)
          .order("effective_school_year", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("school_mou_drafts")
      .select("*")
      .eq("interest_submission_id", id)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  const setupError = pricingError || draftError;
  const years = deriveMouSchoolYears(
    submission.desired_start_term,
    pricing?.effective_school_year ?? "2026-2027",
  );
  const startupBasePrice = Number(
    draft?.startup_base_price ?? MOU_STANDARD_PRICING.startupTotal,
  );
  const firstYearBasePrice = Number(
    draft?.first_year_base_price ?? MOU_STANDARD_PRICING.firstYearTotal,
  );
  const renewalBasePrice = Number(
    draft?.renewal_program_base_price ?? MOU_STANDARD_PRICING.renewalTotal,
  );
  let finalizedDocumentUrl: string | null = null;

  if (draft?.document_storage_bucket && draft?.document_storage_path) {
    const admin = createAdminClient();
    const { data: signedDocument } = await admin.storage
      .from(draft.document_storage_bucket)
      .createSignedUrl(draft.document_storage_path, 60 * 15, {
        download: `${submission.school_name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-mou-revision-${draft.revision}.docx`,
      });
    finalizedDocumentUrl = signedDocument?.signedUrl ?? null;
  }

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />
      <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href={`/onboarding/${id}`} className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]">
            Back to school onboarding
          </Link>
          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">MOU draft</p>
              <h1 className="mt-2 text-3xl font-semibold">Preview MOU · {submission.school_name}</h1>
              <p className="mt-2 text-sm text-zinc-600">Review the school details and apply approved discounts before saving.</p>
            </div>
            {draft ? <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${draft.status !== "draft" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{draft.status === "sent" ? "MOU sent" : draft.status === "ready_to_send" ? "Ready to send" : "Current MOU draft"}</span> : null}
          </div>

          {saved ? <p role="status" className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{updated === "true" ? "MOU draft updated and document regenerated." : `MOU draft saved${generated ? " and document generated" : ""}.`} No email or signature request has been sent.</p> : null}
          {approved ? <p role="status" className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">MOU approved and locked. It is ready for the send-email step.</p> : null}
          {error ? <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessages[error] ?? "The MOU could not be updated."}</p> : null}
          {setupError ? <p role="alert" className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">The MOU tables are not available yet. Run <code>sql/mou-pricing-and-drafts.sql</code> in Supabase, then reload this page.</p> : null}
          {!stateCode ? <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">The state “{submission.state}” could not be matched to a U.S. state.</p> : null}
          {stateCode && !pricing && !setupError ? <p role="alert" className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">No active Middle/High School price exists for {submission.state}. Add pricing before preparing this MOU.</p> : null}

          {draft?.generated_at && finalizedDocumentUrl ? (
            <div className="mt-5 flex flex-col justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-blue-950">Updated MOU draft is ready</p>
                <p className="mt-1 text-xs text-blue-800">Last updated {new Date(draft.generated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. Saving changes regenerates this document.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/onboarding/${id}/mou/preview`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">Review full MOU</Link>
                <a href={finalizedDocumentUrl} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-900 hover:bg-blue-100">Download current MOU</a>
                {draft.status === "draft" ? (
                  <form action={approveMouForSending.bind(null, id)}>
                    <button type="submit" className="h-10 rounded-md border border-green-300 bg-white px-4 text-sm font-semibold text-green-800 hover:bg-green-100">Approve for sending</button>
                  </form>
                ) : draft.status === "ready_to_send" ? (
                  <Link href={`/onboarding/${id}/mou/send`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]">Continue to send</Link>
                ) : draft.status === "sent" ? (
                  <Link href={`/onboarding/${id}/mou/send`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-green-300 bg-white px-4 text-sm font-semibold text-green-800 hover:bg-green-100">View send details</Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {pricing && !setupError && (!draft || draft.status === "draft") ? (
            <MouDraftForm
              submissionId={id}
              startupBasePrice={startupBasePrice}
              firstYearBasePrice={firstYearBasePrice}
              renewalBasePrice={renewalBasePrice}
              startupDiscountName={draft?.startup_discount_name ?? ""}
              startupDiscountPercent={Number(draft?.startup_discount_percent ?? 0)}
              firstYearDiscountName={draft?.first_year_discount_name ?? ""}
              firstYearDiscountPercent={Number(draft?.first_year_discount_percent ?? 0)}
              renewalDiscountName={draft?.renewal_discount_name ?? ""}
              renewalDiscountPercent={Number(draft?.renewal_discount_percent ?? 0)}
              hasGeneratedDocument={Boolean(draft?.generated_at)}
              agreement={{
                contractingPartyName: draft?.contracting_party_name || submission.district_name?.trim() || submission.school_name,
                schoolName: draft?.school_name ?? submission.school_name,
                stateName: submission.state,
                effectiveSchoolYear: draft?.effective_school_year ?? years.effectiveSchoolYear,
                launchSchoolYear: draft?.launch_school_year ?? years.launchSchoolYear,
                renewalSchoolYear: draft?.renewal_school_year ?? years.renewalSchoolYear,
                signerName: draft?.authorized_signer_name ?? submission.signer_name,
                signerEmail: draft?.authorized_signer_email ?? submission.signer_email,
                billingEmail: draft?.billing_email ?? submission.billing_email,
              }}
            />
          ) : null}
          {draft && draft.status !== "draft" ? (
            <div className="mt-6 rounded-lg border border-green-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Pricing and document locked</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">This approved MOU cannot be silently regenerated. Review or download the locked document above before continuing to the send-email step.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

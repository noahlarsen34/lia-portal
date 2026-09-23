import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { getStateCode } from "@/utils/us-states";
import { deriveMouSchoolYears } from "@/utils/mou";
import { MouDraftForm } from "./mou-draft-form";

type MouPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-state": "The submission does not contain a valid U.S. state.",
  "pricing-missing": "Standard pricing has not been configured for this state. Add the state price before creating the MOU.",
  "invalid-discount": "Each discount must be between zero and its base price, and discounts above zero need a name.",
  "save-failed": "The MOU draft could not be saved. Confirm both MOU SQL files were run in Supabase.",
  "draft-locked": "This MOU can no longer be edited because it has moved beyond draft status.",
};

export default async function MouPage({ params, searchParams }: MouPageProps) {
  const { id } = await params;
  const { saved, error } = await searchParams;
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
  const launchBasePrice = Number(draft?.launch_base_price ?? pricing?.launch_base_price ?? 0);
  const renewalBasePrice = Number(draft?.renewal_base_price ?? pricing?.renewal_base_price ?? 0);

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
            {draft ? <span className="self-start rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">Draft revision {draft.revision}</span> : null}
          </div>

          {saved ? <p role="status" className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">MOU draft saved. No email or signature request has been sent.</p> : null}
          {error ? <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessages[error] ?? "The MOU could not be updated."}</p> : null}
          {setupError ? <p role="alert" className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">The MOU tables are not available yet. Run <code>sql/mou-pricing-and-drafts.sql</code> in Supabase, then reload this page.</p> : null}
          {!stateCode ? <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">The state “{submission.state}” could not be matched to a U.S. state.</p> : null}
          {stateCode && !pricing && !setupError ? <p role="alert" className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">No active Middle/High School price exists for {submission.state}. Add pricing before preparing this MOU.</p> : null}

          {pricing && !setupError ? (
            <MouDraftForm
              submissionId={id}
              launchBasePrice={launchBasePrice}
              renewalBasePrice={renewalBasePrice}
              launchDiscountName={draft?.launch_discount_name ?? ""}
              launchDiscountAmount={Number(draft?.launch_discount_amount ?? 0)}
              renewalDiscountName={draft?.renewal_discount_name ?? ""}
              renewalDiscountAmount={Number(draft?.renewal_discount_amount ?? 0)}
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
        </div>
      </section>
    </main>
  );
}

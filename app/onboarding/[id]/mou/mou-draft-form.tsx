"use client";

import { useState } from "react";
import { formatMouCurrency } from "@/utils/mou";
import { saveMouDraft } from "./actions";

type MouDraftFormProps = {
  submissionId: string;
  launchBasePrice: number;
  renewalBasePrice: number;
  launchDiscountName: string;
  launchDiscountAmount: number;
  renewalDiscountName: string;
  renewalDiscountAmount: number;
  agreement: {
    contractingPartyName: string;
    schoolName: string;
    stateName: string;
    effectiveSchoolYear: string;
    launchSchoolYear: string;
    renewalSchoolYear: string;
    signerName: string | null;
    signerEmail: string | null;
    billingEmail: string | null;
  };
};

const fieldClass =
  "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100";

function normalizeAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

export function MouDraftForm(props: MouDraftFormProps) {
  const [launchName, setLaunchName] = useState(props.launchDiscountName);
  const [launchAmount, setLaunchAmount] = useState(String(props.launchDiscountAmount || ""));
  const [renewalName, setRenewalName] = useState(props.renewalDiscountName);
  const [renewalAmount, setRenewalAmount] = useState(String(props.renewalDiscountAmount || ""));
  const saveAction = saveMouDraft.bind(null, props.submissionId);
  const launchDiscount = normalizeAmount(launchAmount);
  const renewalDiscount = normalizeAmount(renewalAmount);
  const launchFinal = Math.max(0, props.launchBasePrice - launchDiscount);
  const renewalFinal = Math.max(0, props.renewalBasePrice - renewalDiscount);

  return (
    <form action={saveAction} className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="self-start rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">Pricing</p>
        <h2 className="mt-1 text-2xl font-semibold">Set discounts</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Standard state pricing is locked. Each price can have one optional, custom-named discount.
        </p>

        <PriceEditor
          title={`Launch · ${props.agreement.launchSchoolYear}`}
          basePrice={props.launchBasePrice}
          name="launch"
          discountName={launchName}
          discountAmount={launchAmount}
          finalPrice={launchFinal}
          onNameChange={setLaunchName}
          onAmountChange={setLaunchAmount}
        />
        <PriceEditor
          title={`Renewal · ${props.agreement.renewalSchoolYear}`}
          basePrice={props.renewalBasePrice}
          name="renewal"
          discountName={renewalName}
          discountAmount={renewalAmount}
          finalPrice={renewalFinal}
          onNameChange={setRenewalName}
          onAmountChange={setRenewalAmount}
        />

        <button type="submit" className="mt-6 h-12 w-full rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]">
          Save MOU draft
        </button>
        <p className="mt-3 text-center text-xs text-zinc-500">
          Saving creates an internal draft only. Nothing is emailed or sent for signature.
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Updated MOU template preview</p>
          <p className="mt-1 text-sm text-zinc-600">Pricing updates instantly as discounts are entered.</p>
        </div>

        <article className="mx-auto max-w-3xl px-6 py-10 text-zinc-900 sm:px-10">
          <header className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c8102e]">Latinos in Action</p>
            <h2 className="mt-3 text-2xl font-bold uppercase">Memorandum of Understanding</h2>
            <p className="mt-3 text-sm text-zinc-600">Effective school year {props.agreement.effectiveSchoolYear}</p>
          </header>

          <div className="mt-10 space-y-5 text-sm leading-7 text-zinc-700">
            <p>
              This Memorandum of Understanding is entered into by and between Latinos in Action, Inc. and <strong className="text-zinc-950">{props.agreement.contractingPartyName}</strong> for implementation at <strong className="text-zinc-950">{props.agreement.schoolName}</strong> in {props.agreement.stateName}.
            </p>
            <p>
              The parties agree to the program responsibilities, implementation requirements, payment terms, and other provisions contained in the approved LIA MOU template.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-md border border-zinc-300">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600">
                <tr><th className="px-4 py-3">Program pricing</th><th className="px-4 py-3 text-right">Launch</th><th className="px-4 py-3 text-right">Renewal</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                <tr><td className="px-4 py-3">School year</td><td className="px-4 py-3 text-right">{props.agreement.launchSchoolYear}</td><td className="px-4 py-3 text-right">{props.agreement.renewalSchoolYear}</td></tr>
                <tr><td className="px-4 py-3">Standard price</td><td className="px-4 py-3 text-right">{formatMouCurrency(props.launchBasePrice)}</td><td className="px-4 py-3 text-right">{formatMouCurrency(props.renewalBasePrice)}</td></tr>
                <tr><td className="px-4 py-3">{launchName || "No launch discount"}</td><td className="px-4 py-3 text-right text-green-700">{launchDiscount ? `−${formatMouCurrency(launchDiscount)}` : "—"}</td><td className="px-4 py-3 text-right">—</td></tr>
                <tr><td className="px-4 py-3">{renewalName || "No renewal discount"}</td><td className="px-4 py-3 text-right">—</td><td className="px-4 py-3 text-right text-green-700">{renewalDiscount ? `−${formatMouCurrency(renewalDiscount)}` : "—"}</td></tr>
                <tr className="bg-red-50 font-bold text-zinc-950"><td className="px-4 py-4">Final contract price</td><td className="px-4 py-4 text-right">{formatMouCurrency(launchFinal)}</td><td className="px-4 py-4 text-right">{formatMouCurrency(renewalFinal)}</td></tr>
              </tbody>
            </table>
          </div>

          <dl className="mt-10 grid gap-5 border-t border-zinc-200 pt-6 sm:grid-cols-2">
            <PreviewField label="Authorized MOU signer" value={props.agreement.signerName} />
            <PreviewField label="Signer email" value={props.agreement.signerEmail} />
            <PreviewField label="Billing email" value={props.agreement.billingEmail} />
            <PreviewField label="LIA signature date" value="Added when LIA signs" />
          </dl>
        </article>
      </section>
    </form>
  );
}

function PriceEditor({ title, basePrice, name, discountName, discountAmount, finalPrice, onNameChange, onAmountChange }: {
  title: string; basePrice: number; name: "launch" | "renewal"; discountName: string; discountAmount: string; finalPrice: number; onNameChange: (value: string) => void; onAmountChange: (value: string) => void;
}) {
  return (
    <fieldset className="mt-6 rounded-md border border-zinc-200 p-4">
      <legend className="px-2 text-sm font-semibold text-zinc-900">{title}</legend>
      <div className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3 text-sm"><span className="text-zinc-600">Standard price</span><strong>{formatMouCurrency(basePrice)}</strong></div>
      <label className="mt-4 block text-sm font-medium text-zinc-700">Discount name
        <input name={`${name}_discount_name`} value={discountName} onChange={(event) => onNameChange(event.target.value)} placeholder="Example: Sponsor discount" className={fieldClass} maxLength={300} required={normalizeAmount(discountAmount) > 0} />
      </label>
      <label className="mt-4 block text-sm font-medium text-zinc-700">Discount amount
        <div className="relative"><span className="pointer-events-none absolute left-3 top-[21px] text-sm text-zinc-500">$</span><input name={`${name}_discount_amount`} type="number" min="0" max={basePrice} step="0.01" value={discountAmount} onChange={(event) => onAmountChange(event.target.value)} placeholder="0.00" className={`${fieldClass} pl-7`} /></div>
      </label>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4"><span className="text-sm font-semibold text-zinc-700">Final price</span><strong className="text-lg text-[#c8102e]">{formatMouCurrency(finalPrice)}</strong></div>
    </fieldset>
  );
}

function PreviewField({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt><dd className="mt-1 text-sm text-zinc-800">{value || "Not provided"}</dd></div>;
}

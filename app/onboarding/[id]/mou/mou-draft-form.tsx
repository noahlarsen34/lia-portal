"use client";

import { useState } from "react";
import {
  calculatePercentageDiscount,
  formatMouCurrency,
  MOU_PROGRAM_SERVICES,
  MOU_STANDARD_PRICING,
} from "@/utils/mou";
import { saveMouDraft } from "./actions";

type MouDraftFormProps = {
  submissionId: string;
  startupBasePrice: number;
  firstYearBasePrice: number;
  renewalBasePrice: number;
  startupDiscountName: string;
  startupDiscountPercent: number;
  firstYearDiscountName: string;
  firstYearDiscountPercent: number;
  renewalDiscountName: string;
  renewalDiscountPercent: number;
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

function normalizePercentage(value: string) {
  const percentage = Number(value);
  return Number.isFinite(percentage) && percentage >= 0 ? percentage : 0;
}

export function MouDraftForm(props: MouDraftFormProps) {
  const [startupName, setStartupName] = useState(props.startupDiscountName);
  const [startupPercent, setStartupPercent] = useState(String(props.startupDiscountPercent || ""));
  const [firstYearName, setFirstYearName] = useState(props.firstYearDiscountName);
  const [firstYearPercent, setFirstYearPercent] = useState(String(props.firstYearDiscountPercent || ""));
  const [renewalName, setRenewalName] = useState(props.renewalDiscountName);
  const [renewalPercent, setRenewalPercent] = useState(String(props.renewalDiscountPercent || ""));
  const saveAction = saveMouDraft.bind(null, props.submissionId);
  const startupDiscount = calculatePercentageDiscount(
    props.startupBasePrice,
    normalizePercentage(startupPercent),
  );
  const firstYearDiscount = calculatePercentageDiscount(
    props.firstYearBasePrice,
    normalizePercentage(firstYearPercent),
  );
  const renewalDiscount = calculatePercentageDiscount(
    props.renewalBasePrice,
    normalizePercentage(renewalPercent),
  );
  const startupFinal = Math.max(0, props.startupBasePrice - startupDiscount);
  const firstYearFinal = Math.max(0, props.firstYearBasePrice - firstYearDiscount);
  const renewalFinal = Math.max(0, props.renewalBasePrice - renewalDiscount);
  const firstYearGrandTotal = startupFinal + firstYearFinal;

  return (
    <form action={saveAction} className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="self-start rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">Pricing</p>
        <h2 className="mt-1 text-2xl font-semibold">Set discounts</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Standard pricing is locked. Each section can have one optional, custom-named percentage discount.
        </p>

        <PriceEditor
          title="Initial start-up costs"
          basePrice={props.startupBasePrice}
          name="startup"
          discountName={startupName}
          discountPercent={startupPercent}
          discountAmount={startupDiscount}
          finalPrice={startupFinal}
          onNameChange={setStartupName}
          onPercentChange={setStartupPercent}
        />
        <PriceEditor
          title={`First-year program · ${props.agreement.launchSchoolYear}`}
          basePrice={props.firstYearBasePrice}
          name="first_year"
          discountName={firstYearName}
          discountPercent={firstYearPercent}
          discountAmount={firstYearDiscount}
          finalPrice={firstYearFinal}
          onNameChange={setFirstYearName}
          onPercentChange={setFirstYearPercent}
        />
        <PriceEditor
          title={`Renewal · ${props.agreement.renewalSchoolYear}`}
          basePrice={props.renewalBasePrice}
          name="renewal"
          discountName={renewalName}
          discountPercent={renewalPercent}
          discountAmount={renewalDiscount}
          finalPrice={renewalFinal}
          onNameChange={setRenewalName}
          onPercentChange={setRenewalPercent}
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

        <article className="mx-auto max-w-3xl px-6 py-8 text-zinc-900 sm:px-8">
          <header className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c8102e]">Latinos in Action</p>
            <h2 className="mt-3 text-2xl font-bold uppercase">Memorandum of Understanding</h2>
            <p className="mt-3 text-sm text-zinc-600">Effective school year {props.agreement.effectiveSchoolYear}</p>
          </header>

          <div className="mt-7 space-y-3 text-sm leading-6 text-zinc-700">
            <p>
              This Memorandum of Understanding is entered into by and between Latinos in Action, Inc. and <strong className="text-zinc-950">{props.agreement.contractingPartyName}</strong> for implementation at <strong className="text-zinc-950">{props.agreement.schoolName}</strong> in {props.agreement.stateName}.
            </p>
            <p>
              The parties agree to the program responsibilities, implementation requirements, payment terms, and other provisions contained in the approved LIA MOU template.
            </p>
          </div>

          <div className="mt-7 space-y-5">
            <PricingPreviewSection
              title={`Initial start-up costs · ${props.agreement.launchSchoolYear}`}
              rows={[
                { label: "Start-up fee, onboarding, and first-year training", amount: MOU_STANDARD_PRICING.startupTraining },
                { label: "Travel fees — initial meeting and founder visit", amount: MOU_STANDARD_PRICING.startupTravel },
              ]}
              discountName={startupName}
              discountPercent={normalizePercentage(startupPercent)}
              discountAmount={startupDiscount}
              finalLabel="Start-up fee total"
              finalPrice={startupFinal}
            />
            <RecurringPricingComparison
              launchSchoolYear={props.agreement.launchSchoolYear}
              renewalSchoolYear={props.agreement.renewalSchoolYear}
              firstYearDiscountName={firstYearName}
              firstYearDiscountPercent={normalizePercentage(firstYearPercent)}
              firstYearDiscountAmount={firstYearDiscount}
              firstYearFinal={firstYearFinal}
              firstYearGrandTotal={firstYearGrandTotal}
              renewalDiscountName={renewalName}
              renewalDiscountPercent={normalizePercentage(renewalPercent)}
              renewalDiscountAmount={renewalDiscount}
              renewalFinal={renewalFinal}
            />
          </div>

          <dl className="mt-7 grid gap-4 border-t border-zinc-200 pt-5 sm:grid-cols-2">
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

function PriceEditor({ title, basePrice, name, discountName, discountPercent, discountAmount, finalPrice, onNameChange, onPercentChange }: {
  title: string; basePrice: number; name: "startup" | "first_year" | "renewal"; discountName: string; discountPercent: string; discountAmount: number; finalPrice: number; onNameChange: (value: string) => void; onPercentChange: (value: string) => void;
}) {
  return (
    <fieldset className="mt-6 rounded-md border border-zinc-200 p-4">
      <legend className="px-2 text-sm font-semibold text-zinc-900">{title}</legend>
      <div className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3 text-sm"><span className="text-zinc-600">Standard price</span><strong>{formatMouCurrency(basePrice)}</strong></div>
      <label className="mt-4 block text-sm font-medium text-zinc-700">Discount name
        <input name={`${name}_discount_name`} value={discountName} onChange={(event) => onNameChange(event.target.value)} placeholder="Example: Sponsor discount" className={fieldClass} maxLength={300} required={normalizePercentage(discountPercent) > 0} />
      </label>
      <label className="mt-4 block text-sm font-medium text-zinc-700">Discount percentage
        <div className="relative"><input name={`${name}_discount_percent`} type="number" min="0" max="100" step="0.01" value={discountPercent} onChange={(event) => onPercentChange(event.target.value)} placeholder="0" className={`${fieldClass} pr-9`} /><span className="pointer-events-none absolute right-3 top-[21px] text-sm text-zinc-500">%</span></div>
      </label>
      <div className="mt-3 flex items-center justify-between text-sm text-zinc-600"><span>Calculated savings</span><span>−{formatMouCurrency(discountAmount)}</span></div>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4"><span className="text-sm font-semibold text-zinc-700">Final price</span><strong className="text-lg text-[#c8102e]">{formatMouCurrency(finalPrice)}</strong></div>
    </fieldset>
  );
}

function PricingPreviewSection({ title, rows, discountName, discountPercent, discountAmount, finalLabel, finalPrice }: {
  title: string;
  rows: ReadonlyArray<{ label: string; amount: number }>;
  discountName: string;
  discountPercent: number;
  discountAmount: number;
  finalLabel: string;
  finalPrice: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-300">
      <div className="bg-zinc-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-700">{title}</div>
      <table className="w-full border-collapse text-left text-sm">
        <tbody className="divide-y divide-zinc-200">
          {rows.map((row) => (
            <tr key={row.label}><td className="px-4 py-3">{row.label}</td><td className="px-4 py-3 text-right">{formatMouCurrency(row.amount)}</td></tr>
          ))}
          <tr><td className="px-4 py-3">{discountName || "No discount"}{discountPercent > 0 ? ` (${discountPercent}%)` : ""}</td><td className="px-4 py-3 text-right text-green-700">{discountAmount > 0 ? `−${formatMouCurrency(discountAmount)}` : "—"}</td></tr>
          <tr className="bg-red-50 font-bold text-zinc-950"><td className="px-4 py-4">{finalLabel}</td><td className="px-4 py-4 text-right">{formatMouCurrency(finalPrice)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function RecurringPricingComparison({
  launchSchoolYear,
  renewalSchoolYear,
  firstYearDiscountName,
  firstYearDiscountPercent,
  firstYearDiscountAmount,
  firstYearFinal,
  firstYearGrandTotal,
  renewalDiscountName,
  renewalDiscountPercent,
  renewalDiscountAmount,
  renewalFinal,
}: {
  launchSchoolYear: string;
  renewalSchoolYear: string;
  firstYearDiscountName: string;
  firstYearDiscountPercent: number;
  firstYearDiscountAmount: number;
  firstYearFinal: number;
  firstYearGrandTotal: number;
  renewalDiscountName: string;
  renewalDiscountPercent: number;
  renewalDiscountAmount: number;
  renewalFinal: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-300">
      <div className="bg-zinc-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-700">
        Program membership costs
      </div>
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead className="border-t border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
          <tr>
            <th className="w-[58%] px-4 py-2.5 font-semibold">Service</th>
            <th className="w-[21%] px-3 py-2.5 text-right font-semibold">First year<br />{launchSchoolYear}</th>
            <th className="w-[21%] px-3 py-2.5 text-right font-semibold">Renewal<br />{renewalSchoolYear}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {MOU_PROGRAM_SERVICES.map((row) => (
            <tr key={row.label}>
              <td className="px-4 py-2.5 leading-5">{row.label}</td>
              <td className="px-3 py-2.5 text-right">{formatMouCurrency(row.amount)}</td>
              <td className="px-3 py-2.5 text-right">{formatMouCurrency(row.amount)}</td>
            </tr>
          ))}
          <tr>
            <td className="px-4 py-2.5 leading-5">
              <span className="font-medium">{firstYearDiscountName || "No first-year discount"}</span>
              {firstYearDiscountPercent > 0 ? <span className="ml-1 text-zinc-500">({firstYearDiscountPercent}%)</span> : null}
            </td>
            <td className="px-3 py-2.5 text-right text-green-700">{firstYearDiscountAmount > 0 ? `−${formatMouCurrency(firstYearDiscountAmount)}` : "—"}</td>
            <td className="px-3 py-2.5 text-right">—</td>
          </tr>
          <tr>
            <td className="px-4 py-2.5 leading-5">
              <span className="font-medium">{renewalDiscountName || "No renewal discount"}</span>
              {renewalDiscountPercent > 0 ? <span className="ml-1 text-zinc-500">({renewalDiscountPercent}%)</span> : null}
            </td>
            <td className="px-3 py-2.5 text-right">—</td>
            <td className="px-3 py-2.5 text-right text-green-700">{renewalDiscountAmount > 0 ? `−${formatMouCurrency(renewalDiscountAmount)}` : "—"}</td>
          </tr>
          <tr className="bg-red-50 font-bold text-zinc-950">
            <td className="px-4 py-3">Program total</td>
            <td className="px-3 py-3 text-right">{formatMouCurrency(firstYearFinal)}</td>
            <td className="px-3 py-3 text-right">{formatMouCurrency(renewalFinal)}</td>
          </tr>
          <tr className="border-t-2 border-red-200 bg-red-50 font-bold text-zinc-950">
            <td className="px-4 py-3">Grand total first-year implementation</td>
            <td className="px-3 py-3 text-right text-base text-[#c8102e]">{formatMouCurrency(firstYearGrandTotal)}</td>
            <td className="px-3 py-3 text-right text-zinc-400">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt><dd className="mt-1 text-sm text-zinc-800">{value || "Not provided"}</dd></div>;
}

"use client";

import { useActionState } from "react";
import { submitSchoolInterest, type InterestFormState } from "./actions";

const initialState: InterestFormState = { status: "idle", message: "" };
const inputClass = "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100";

export function InterestForm({ source }: { source: string }) {
  const [state, formAction, pending] = useActionState(submitSchoolInterest, initialState);

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center" role="status">
        <h2 className="text-xl font-semibold text-green-900">Interest form received</h2>
        <p className="mt-2 text-sm leading-6 text-green-800">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="source" value={source} />

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">School information</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="School name" name="school_name" required />
          <Field label="District or network" name="district_name" />
          <Field label="City" name="city" required />
          <Field label="State abbreviation" name="state" maxLength={2} placeholder="UT" required />
          <Field label="School website" name="website" type="url" placeholder="https://" />
          <Field label="Desired start term" name="desired_start_term" placeholder="Fall 2027" required />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Primary contact</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="First name" name="contact_first_name" autoComplete="given-name" required />
          <Field label="Last name" name="contact_last_name" autoComplete="family-name" required />
          <Field label="Job title" name="contact_title" required />
          <Field label="Work email" name="contact_email" type="email" autoComplete="email" required />
          <Field label="Phone" name="contact_phone" type="tel" autoComplete="tel" />
          <label className="flex min-h-11 items-start gap-3 self-end rounded-md bg-zinc-50 px-4 py-3 text-sm leading-5 text-zinc-700 md:items-center">
            <input className="mt-0.5 shrink-0 md:mt-0" type="checkbox" name="is_decision_maker" value="yes" />
            I am authorized to make or approve decisions about bringing LIA to this school.
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Program fit</legend>
        <div>
          <p className="text-sm font-medium text-zinc-700">Grades served by the proposed program *</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {["6", "7", "8", "9", "10", "11", "12"].map((grade) => (
              <label key={grade} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="grade_levels" value={grade} /> Grade {grade}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Estimated student count" name="estimated_student_count" type="number" min={1} max={10000} />
          <label className="text-sm font-medium text-zinc-700">
            Funding status *
            <select className={inputClass} name="funding_status" defaultValue="" required>
              <option value="" disabled>Select one</option>
              <option value="identified">Funding identified</option>
              <option value="exploring">Exploring funding options</option>
              <option value="needs_support">Need help identifying funding</option>
              <option value="unknown">Not sure yet</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Additional contacts and context</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Authorized signer name" name="signer_name" />
          <Field label="Authorized signer email" name="signer_email" type="email" />
          <Field label="Billing contact email" name="billing_email" type="email" />
          <Field label="How did you hear about LIA?" name="referral_source" />
        </div>
        <label className="block text-sm font-medium text-zinc-700">
          Anything else we should know?
          <textarea className="mt-2 min-h-28 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100" name="notes" maxLength={2000} />
        </label>
      </fieldset>

      <label className="flex items-start gap-3 rounded-md bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
        <input className="mt-1" type="checkbox" name="consent_to_contact" value="yes" required />
        I agree that Latinos In Action may contact me about school onboarding and next steps. *
      </label>

      {state.status === "error" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{state.message}</p>
      ) : null}

      <button className="h-12 w-full rounded-md bg-[#c8102e] px-6 text-sm font-semibold text-white transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:bg-zinc-400" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit interest form"}
      </button>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string };

function Field({ label, name, ...props }: FieldProps) {
  return (
    <label className="text-sm font-medium text-zinc-700">
      {label}{props.required ? " *" : ""}
      <input className={inputClass} name={name} {...props} />
    </label>
  );
}

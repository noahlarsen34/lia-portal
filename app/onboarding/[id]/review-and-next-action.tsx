"use client";

import { useState } from "react";
import {
    archiveInterestSubmission,
    deleteInterestSubmission,
    restoreInterestSubmission,
    updateInterestSubmission,
} from "./actions";
import { ONBOARDING_STAGES, ONBOARDING_STAGE_LABELS } from "@/utils/onboarding-stages";

type StaffMember = {
    id: string;
    name: string;
};

type ReviewData = {
    id: string;
    assignedTo: string | null;
    assignedToName: string | null;
    pipelineStage: string;
    status: string;
    nextAction: string;
    nextActionDueAt: string | null;
    internalNotes: string | null;
    schoolName: string;
    archivedAt: string | null;
    archiveReason: string | null;
};

type ReviewAndNextActionProps = {
    review: ReviewData;
    staff: StaffMember[];
    initialEditing?: boolean;
    canDelete: boolean;
};

const archiveReasons = [
    ["onboarding_completed", "Onboarding completed"],
    ["school_declined", "School declined"],
    ["not_qualified", "Not qualified"],
    ["unresponsive", "Unresponsive"],
    ["duplicate", "Duplicate submission"],
    ["other", "Other"],
] as const;

const archiveReasonLabels = Object.fromEntries(archiveReasons);

const statusLabels: Record<string, string> = {
    open: "Open",
    completed: "Completed",
    closed: "Closed",
};

const fieldClass =
    "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100";

export function ReviewAndNextAction({
    review,
    staff,
    initialEditing = false,
    canDelete,
}: ReviewAndNextActionProps) {
    const [isEditing, setIsEditing] = useState(initialEditing);
    const [showArchiveForm, setShowArchiveForm] = useState(false);
    const [showDeleteForm, setShowDeleteForm] = useState(false);

    if (isEditing && !review.archivedAt) {
        return (
            <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div>
                    <h2 className="text-xl font-semibold">
                        Edit review and next action
                    </h2>

                    <p className="mt-1 text-sm text-zinc-600">
                        Update the school&apos;s pipeline status and staff follow-up.
                    </p>
                </div>

                <form
                    action={updateInterestSubmission}
                    className="mt-6 space-y-5"
                >
                    <input
                        type="hidden"
                        name="submission_id"
                        value={review.id}
                    />

                    <label className="block text-sm font-medium text-zinc-700">
                        Assigned staff member
                        <select
                            name="assigned_to"
                            defaultValue={review.assignedTo ?? ""}
                            className={fieldClass}
                        >
                            <option value="">Unassigned</option>

                            {staff.map((person) => (
                                <option key={person.id} value={person.id}>
                                    {person.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <fieldset>
                        <legend className="text-sm font-medium text-zinc-700">
                            Pipeline stage *
                        </legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {ONBOARDING_STAGES.map(([value, label]) => (
                                <label
                                    key={value}
                                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 transition hover:border-red-200 hover:bg-red-50 has-[:checked]:border-[#c8102e] has-[:checked]:bg-red-50 has-[:checked]:font-semibold has-[:checked]:text-[#c8102e]"
                                >
                                    <input
                                        type="radio"
                                        name="pipeline_stage"
                                        value={value}
                                        defaultChecked={review.pipelineStage === value}
                                        required
                                        className="h-4 w-4 accent-[#c8102e]"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <label className="block text-sm font-medium text-zinc-700">
                        Next action *
                        <input
                            name="next_action"
                            defaultValue={review.nextAction}
                            className={fieldClass}
                            required
                        />
                    </label>

                    <label className="block text-sm font-medium text-zinc-700">
                        Internal notes
                        <textarea
                            name="internal_notes"
                            defaultValue={review.internalNotes ?? ""}
                            className="mt-2 min-h-40 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                        /> 
                    </label>

                    <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="h-11 rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="h-11 rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Save changes
                        </button>
                    </div>
                </form>
            </section>
        );
    }

    const overdue =
        review.status === "open" &&
        review.nextActionDueAt !== null &&
        review.nextActionDueAt <
            new Date().toISOString().slice(0, 10);
    
    return (
        <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-6">
            {review.archivedAt ? (
                <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                        Archived {new Date(review.archivedAt).toLocaleDateString("en-US")}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                        Reason: {archiveReasonLabels[review.archiveReason ?? ""] ?? "Not specified"}
                    </p>
                </div>
            ) : null}

            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                    <h2 className="text-xl font-semibold">
                        Review and next action
                    </h2>

                    <p className="mt-1 text-sm text-zinc-600">
                        Current onboarding status and staff follow-up.
                    </p>
                </div>

                <div className="flex shrink-0 flex-nowrap gap-2">
                    {review.archivedAt ? (
                        <form action={restoreInterestSubmission}>
                            <input type="hidden" name="submission_id" value={review.id} />
                            <button type="submit" className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                                Restore record
                            </button>
                        </form>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c8102e] hover:bg-red-50"
                            >
                                Edit review
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowArchiveForm((value) => !value)}
                                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Archive
                            </button>
                        </>
                    )}
                </div>
            </div>

            {showArchiveForm && !review.archivedAt ? (
                <form action={archiveInterestSubmission} className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                    <input type="hidden" name="submission_id" value={review.id} />
                    <label className="block text-sm font-medium text-zinc-700">
                        Why are you archiving this record?
                        <select name="archive_reason" required defaultValue="" className={fieldClass}>
                            <option value="" disabled>Select a reason</option>
                            {archiveReasons.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                    <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setShowArchiveForm(false)} className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
                            Cancel
                        </button>
                        <button type="submit" className="h-10 rounded-md bg-zinc-800 px-4 text-sm font-semibold text-white hover:bg-zinc-950">
                            Archive record
                        </button>
                    </div>
                </form>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#c8102e]">
                    {ONBOARDING_STAGE_LABELS[review.pipelineStage as keyof typeof ONBOARDING_STAGE_LABELS] ??
                        review.pipelineStage}
                </span>

                <span
                    className={
                        review.status === "open"
                            ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700"
                            : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700"
                    }
                >
                    {statusLabels[review.status] ?? review.status}
                </span>
            </div>

            <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Next action
                </p>

                <p className="mt-2 text-base font-semibold text-zinc-950">
                    {review.nextAction}
                </p>

                <div className="mt-4 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2">
                    <DisplayField
                        label="Assigned to"
                        value={review.assignedToName ?? "Unassigned"}
                    />

                    <DisplayField
                        label="Due date"
                        value={
                            review.nextActionDueAt
                                ? formatDate(review.nextActionDueAt)
                                : "No due date"
                        }
                        emphasized={overdue}
                        suffix={overdue ? "Overdue" : undefined}
                    />
                </div>
            </div>

            <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Internal notes
                </p>

                {review.internalNotes ? (
                    <p className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                        {review.internalNotes}
                    </p>
                ) : (
                    <p className="mt-2 text-sm italic text-zinc-500">
                        No internal notes have been added.
                    </p>
                )}
            </div>

            {canDelete ? (
                <div className="mt-8 border-t border-zinc-200 pt-5">
                    {!showDeleteForm ? (
                        <button type="button" onClick={() => setShowDeleteForm(true)} className="text-sm font-semibold text-red-700 hover:text-red-900">
                            Permanently delete record
                        </button>
                    ) : (
                        <form action={deleteInterestSubmission} className="rounded-md border border-red-200 bg-red-50 p-4">
                            <input type="hidden" name="submission_id" value={review.id} />
                            <p className="text-sm font-semibold text-red-900">This cannot be undone.</p>
                            <label className="mt-2 block text-sm text-red-800">
                                Type <strong>{review.schoolName}</strong> to permanently delete this submission.
                                <input name="confirmation" required autoComplete="off" className="mt-2 h-11 w-full rounded-md border border-red-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" />
                            </label>
                            <div className="mt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowDeleteForm(false)} className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Cancel</button>
                                <button type="submit" className="h-10 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800">Delete permanently</button>
                            </div>
                        </form>
                    )}
                </div>
            ) : null}
        </section>
    );
}

function DisplayField({
    label,
    value,
    emphasized = false,
    suffix,
} : {
    label: string;
    value: string;
    emphasized?: boolean;
    suffix?: string;
}) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {label}
            </p>

            <p
                className={
                    emphasized
                        ? "mt-1 font-semibold text-red-700"
                        : "mt-1 text-sm text-zinc-800"
                }
            >
                {value}

                {suffix ? (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        {suffix}
                    </span>
                ) : null}
            </p>
        </div>
    );
}

function formatDate(value: string) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(
        'en-US',
        {
            month: "long",
            day: "numeric",
            year: "numeric",
        },
    );
}

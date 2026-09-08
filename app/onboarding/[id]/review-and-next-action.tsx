"use client";

import { useState } from "react";
import { updateInterestSubmission } from "./actions";

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
};

type ReviewAndNextActionProps = {
    review: ReviewData;
    staff: StaffMember[];
    initalEditing?: boolean;
};

const pipelineStages = [
    ["new_interest", "New Interest"],
    ["scheduling", "Scheduling"],
    ["meeting_scheduled", "Meeting Scheduled"],
    ["qualified", "Qualified"],
    ["awaiting_school_signature", "Awaiting School Signature"],
    ["awaiting_lia_signature", "Awating LIA Signature"],
    ["fully_executed", "Fully Executed"],
    ["active", "Active"],
    ["unqualified", "Unqualified"],
    ["unresponsive", "Unresponsive"],
    ["declined", "Declined"],
] as const;

const stageLabels = Object.fromEntries(pipelineStages);

const statusLabels: Record<string, string> = {
    open: "Open",
    completed: "Completed",
    closed: "Closed",
};

const fieldClass =
    "mt-2 h-11 w-full rounded-md border broder-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100";

export function ReviewAndNextAction({
    review,
    staff,
    initalEditing = false,
}: ReviewAndNextActionProps) {
    const [isEditing, setIsEditing] = useState(initalEditing);

    if (isEditing) {
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

                    <label className="block text-sm font-medium text-zinc-700">
                        Pipleline stage *
                        <select
                            name="pipleline_stage"
                            defaultValue={review.pipelineStage}
                            className={fieldClass}
                            required
                        >
                            {pipelineStages.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block text-sm font-medium text-zinc-700">
                        Record status *
                        <select
                            name="status"
                            defaultValue={review.status}
                            className={fieldClass}
                            required
                        >
                            <option value="open">Open</option>
                            <option value="completed">Completed</option>
                            <option value="closed">Closed</option>
                        </select>                   
                    </label>

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
                        Next-action due date
                        <input
                            name="next_action_due_at"
                            type="date"
                            defaultValue={review.nextActionDueAt ?? ""}
                            className={fieldClass}
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
                            type="submit"
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
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold">
                        Review and next action
                    </h2>

                    <p className="mt-1 text-sm text-zinc-600">
                        Current onboarding status and staff follow-up.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="shrink-0 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c8102e] hover:bg-red-50"
                >
                    Edit review
                </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#c8102e]">
                    {stageLabels[review.pipelineStage] ??
                        review.pipelineStage}
                </span>

                <span
                    className={
                        review.status === "open"
                            ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700"
                            : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700"
                    }
                >
                    {statusLabels[review.status ?? review.status]}
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
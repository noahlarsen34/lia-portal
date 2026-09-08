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
                        Update the school's pipeline status and staff follow-up.
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
                            
                        </select>                   
                    </label>
                </form>
            </section>
        )
    }
}
"use client";

import { useState } from "react";

type SchoolProfileNotesProps = {
    notes: string | null;
    saved: boolean;
    saveError: boolean;
    updateNotesAction: (formData: FormData) => Promise<void>;
};

export function SchoolProfileNotes({
    notes,
    saved,
    saveError,
    updateNotesAction,
}: SchoolProfileNotesProps) {
    const [isEditing, setIsEditing] = useState(saveError);
    const hasNotes = Boolean(notes?.trim());

    return (
        <div className="min-h-48 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Profile Notes</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Internal notes for staff working with this school.
                    </p>
                </div>

                {saved && !isEditing ? (
                    <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Saved
                    </span>
                ) : null}
            </div>

            {saveError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Notes could not be saved. Please try again.
                </div>
            ) : null}

            {isEditing ? (
                <form action={updateNotesAction} className="space-y-4">
                    <textarea
                        name="notes"
                        defaultValue={notes ?? ""}
                        rows={10}
                        autoFocus
                        placeholder="Add profile notes for this school..."
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                    />

                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Save Notes
                        </button>
                    </div>
                </form>
            ) : (
                <div>
                    <div className="min-h-40 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-4">
                        {hasNotes ? (
                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700 [overflow-wrap:anywhere]">
                                {notes}
                            </p>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                No profile notes have been added yet.
                            </p>
                        )}
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            {hasNotes ? "Edit Notes" : "Add Notes"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

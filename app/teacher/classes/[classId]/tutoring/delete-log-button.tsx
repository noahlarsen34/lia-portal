"use client";

import { Trash2 } from "lucide-react";

type DeleteLogButtonProps = {
    deleteAction: () => Promise<void>;
    studentName: string;
};

export default function DeleteLogButton({
    deleteAction,
    studentName,
}: DeleteLogButtonProps) {
    return (
        <form
            action={deleteAction}
            onSubmit={(event) => {
                const confirmed = window.confirm(
                    `Delete ${studentName}'s tutoring log? This cannot be undone.`,
                );

                if (!confirmed) {
                    event.preventDefault();
                }
            }}
        >
            <button
                type="submit"
                aria-label={`Delete ${studentName}'s log`}
                title="Delete log"
                className="inline-flex size-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
                <Trash2 aria-hidden="true" className="size-4" />
            </button>
        </form>
    );
}

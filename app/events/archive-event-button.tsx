"use client";

import { Archive } from "lucide-react";

type ArchiveEventButtonProps = {
    eventName: string;
    action: () => Promise<void>;
};

export function ArchiveEventButton({
    eventName,
    action,
}: ArchiveEventButtonProps) {
    return (
        <form
            action={action}
            onSubmit={(event) => {
                const confirmed = window.confirm(
                    `Archive "${eventName}"? It will be hidden from teachers, but you can restore it later.`,
                );

                if (!confirmed) {
                    event.preventDefault();
                }
            }}
        >
            <button
                type="submit"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
                <Archive className="h-4 w-4" />
                Archive
            </button>
        </form>
    );
}

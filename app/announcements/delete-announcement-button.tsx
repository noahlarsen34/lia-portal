"use client";

import { Trash2 } from "lucide-react";

type DeleteAnnouncementButtonProps = {
    deleteAction: () => Promise<void>;
    announcementTitle: string;
};

export function DeleteAnnouncementButton({
    deleteAction,
    announcementTitle,
}: DeleteAnnouncementButtonProps) {
    return (
        <form
            action={deleteAction}
            onSubmit={(event) => {
                const confirmed = window.confirm(
                    `Delete "${announcementTitle}"? Teachers will no longer be able to see this announcement.`,
                );

                if (!confirmed) {
                    event.preventDefault();
                }
            }}
        >
            <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
                <Trash2 className="size-4" aria-hidden />
                Delete
            </button>
        </form>
    );
}

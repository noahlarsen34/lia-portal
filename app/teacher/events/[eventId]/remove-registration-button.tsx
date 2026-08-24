"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { removeEventRegistration } from "./actions";

type RemoveRegistrationButtonProps = {
    eventId: string;
    registrationId: string;
    studentName: string;
};

function RemoveButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <Trash2 className="h-4 w-4" />
            {pending ? "Removing..." : "Remove"}
        </button>
    );
}

export function RemoveRegistrationButton({
    eventId,
    registrationId,
    studentName,
} : RemoveRegistrationButtonProps) {
    return (
        <form
            action={removeEventRegistration}
            onSubmit={(event) => {
                const confirmed = window.confirm(
                    `Remove ${studentName} from this event?\n\nTheir ticket will no longer be valid.`,
                );

                if (!confirmed) {
                    event.preventDefault();
                }
            }}
        >
            <input
                type="hidden"
                name="event_id"
                value={eventId}
            />

            <input
                type="hidden"
                name="registration_id"
                value={registrationId}
            />

            <RemoveButton />
        </form>
    );
}
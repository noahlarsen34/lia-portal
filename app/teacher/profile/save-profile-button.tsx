"use client";

import { useFormStatus } from "react-dom";

export function SaveProfileButton() {
    const { pending } = useFormStatus();

    return (
        <button 
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-5 text-sm font-semibold text-white transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? "Saving..." : "Save Profile"}
        </button>
    );
}

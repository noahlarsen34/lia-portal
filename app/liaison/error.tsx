"use client";

import { useEffect } from "react";

export default function LiaisonError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("District liaison portal error", error);
    }, [error]);

    return (
        <div className="mx-auto max-w-3xl">
            <section className="rounded-md border border-red-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    District Liaison Portal
                </p>
                <h1 className="mt-3 text-2xl font-semibold">
                    We couldn&apos;t load this information
                </h1>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                    Your account is still secure. Try loading the page again, and
                    contact LIA support if the problem continues.
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                >
                    Try Again
                </button>
            </section>
        </div>
    );
}

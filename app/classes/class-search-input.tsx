"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ClassSearchInputProps = {
    initialSearch: string;
    selectedStatus: string;
    selectedRpm: string;
};

export function ClassSearchInput({
    initialSearch,
    selectedStatus,
    selectedRpm,
}: ClassSearchInputProps) {
    const router = useRouter();
    const [search, setSearch] = useState(initialSearch);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const normalizedSearch = search.trim();

        if (normalizedSearch === initialSearch) {
            return;
        }

        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams();

            if (normalizedSearch) {
                params.set("search", normalizedSearch);
            }

            if (selectedStatus !== "active") {
                params.set("status", selectedStatus);
            }

            if (selectedRpm !== "all") {
                params.set("rpm", selectedRpm);
            }

            const queryString = params.toString();
            const destination = queryString
                ? `/classes?${queryString}`
                : "/classes";

            startTransition(() => {
                router.replace(destination, { scroll: false });
            });
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [initialSearch, router, search, selectedStatus, selectedRpm]);

    return (
        <label className="block">
            <span className="text-sm font-semibold text-zinc-700">
                Search classes
            </span>

            <div className="relative mt-2">
                <input
                    name="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Class name..."
                    autoComplete="off"
                    className="h-11 w-full rounded-md border border-zinc-300 px-3 pr-24 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                />

                {isPending ? (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-zinc-500">
                        Searching…
                    </span>
                ) : null}
            </div>
        </label>
    );
}

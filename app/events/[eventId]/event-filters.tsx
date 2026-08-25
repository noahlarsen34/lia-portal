"use client";

import { RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type FilterOption = {
    value: string;
    label: string;
};

type EventFiltersProps = {
    eventId: string;
    initialQuery: string;
    initialStatus: string;
    initialSchool: string;
    initialCategory: string;
    schools: FilterOption[];
    categories: string[];
};

export function EventFilters({
    eventId,
    initialQuery,
    initialStatus,
    initialSchool,
    initialCategory,
    schools,
    categories,
}: EventFiltersProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState(initialQuery);
    const [status, setStatus] = useState(initialStatus);
    const [school, setSchool] = useState(initialSchool);
    const [category, setCategory] = useState(initialCategory);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const params = new URLSearchParams();

            if (query.trim()) params.set("q", query.trim());
            if (status) params.set("status", status);
            if (school) params.set("school", school);
            if (category) params.set("category", category);

            const queryString = params.toString();
            const href = queryString
                ? `/events/${eventId}?${queryString}`
                : `/events/${eventId}`;

            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [category, eventId, query, router, school, status]);

    return (
        <div
            className={`mt-7 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-opacity md:grid-cols-[minmax(240px,1fr)_180px_220px_220px_auto] ${
                isPending ? "opacity-65" : "opacity-100"
            }`}
        >
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Student, email, school, ticket..."
                    aria-label="Search registrations"
                    className="h-11 w-full rounded-lg border border-zinc-300 pl-10 pr-3 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                />
            </div>

            <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by status"
                className="h-11 rounded-lg border border-zinc-300 px-3"
            >
                <option value="">All statuses</option>
                <option value="registered">Registered</option>
                <option value="ticket_issued">Ticket issued</option>
                <option value="checked_in">Checked in</option>
                <option value="withdrawn">Withdrawn</option>
            </select>

            <select
                value={school}
                onChange={(event) => setSchool(event.target.value)}
                aria-label="Filter by school"
                className="h-11 rounded-lg border border-zinc-300 px-3"
            >
                <option value="">All schools</option>
                {schools.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by competition category"
                className="h-11 rounded-lg border border-zinc-300 px-3"
            >
                <option value="">All categories</option>
                {categories.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>

            <button
                type="button"
                disabled={!query && !status && !school && !category}
                onClick={() => {
                    setQuery("");
                    setStatus("");
                    setSchool("");
                    setCategory("");
                    startTransition(() => {
                        router.replace(`/events/${eventId}`, {
                            scroll: false,
                        });
                    });
                }}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-[#c8102e] disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 disabled:hover:border-zinc-300"
            >
                <RotateCcw className="h-4 w-4" />
                Clear filters
            </button>
        </div>
    );
}

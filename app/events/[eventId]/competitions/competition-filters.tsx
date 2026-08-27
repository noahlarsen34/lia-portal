"use client";

import { RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type FilterOption = { value: string; label: string };

type CompetitionFiltersProps = {
    eventId: string;
    initialQuery: string;
    initialCategory: string;
    initialSchool: string;
    initialStatus: string;
    categories: string[];
    schools: FilterOption[];
};

export function CompetitionFilters({
    eventId,
    initialQuery,
    initialCategory,
    initialSchool,
    initialStatus,
    categories,
    schools,
}: CompetitionFiltersProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState(initialQuery);
    const [category, setCategory] = useState(initialCategory);
    const [school, setSchool] = useState(initialSchool);
    const [status, setStatus] = useState(initialStatus);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const params = new URLSearchParams();

            if (query.trim()) params.set("q", query.trim());
            if (category) params.set("category", category);
            if (school) params.set("school", school);
            if (status) params.set("status", status);

            const queryString = params.toString();
            const basePath = `/events/${eventId}/competitions`;

            startTransition(() => {
                router.replace(
                    queryString ? `${basePath}?${queryString}` : basePath,
                    { scroll: false },
                );
            });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [category, eventId, query, router, school, status]);

    const hasFilters = Boolean(query || category || school || status);

    return (
        <div
            className={`mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-opacity md:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_13rem_15rem_13rem_auto] ${
                isPending ? "opacity-65" : "opacity-100"
            }`}
        >
            <label className="relative">
                <span className="sr-only">Search competition entries</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Student, title, school..."
                    className="h-12 w-full rounded-lg border border-zinc-300 bg-white pl-12 pr-4 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                />
            </label>

            <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by competition category"
                className="h-12 rounded-lg border border-zinc-300 bg-white px-4 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
            >
                <option value="">All categories</option>
                {categories.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>

            <select
                value={school}
                onChange={(event) => setSchool(event.target.value)}
                aria-label="Filter by school"
                className="h-12 rounded-lg border border-zinc-300 bg-white px-4 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
            >
                <option value="">All schools</option>
                {schools.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>

            <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by competition result"
                className="h-12 rounded-lg border border-zinc-300 bg-white px-4 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
            >
                <option value="">All results</option>
                <option value="unreviewed">Not reviewed</option>
                <option value="reviewed">Reviewed</option>
                <option value="high-rating">Rated 4 or higher</option>
                <option value="finalist">Finalists</option>
                <option value="winner">Winners</option>
            </select>

            <button
                type="button"
                disabled={!hasFilters}
                onClick={() => {
                    setQuery("");
                    setCategory("");
                    setSchool("");
                    setStatus("");
                    startTransition(() => {
                        router.replace(`/events/${eventId}/competitions`, {
                            scroll: false,
                        });
                    });
                }}
                className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 font-semibold text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-[#c8102e] disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 disabled:hover:border-zinc-300"
            >
                <RotateCcw className="h-4 w-4" />
                Clear filters
            </button>
        </div>
    );
}

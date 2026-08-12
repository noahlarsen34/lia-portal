"use client";

import { useMemo, useState } from "react";

export type EventSchoolOption = {
    id: string;
    name: string;
    state: string | null;
};

type SchoolSelectorProps = {
    schools: EventSchoolOption[];
    initalAllSchools?: boolean;
    initalSelectedSchoolIds?: string[];
};

const ALL_STATES = "all";

export function SchoolSelector({ schools, initalAllSchools = false, initalSelectedSchoolIds = [], }: SchoolSelectorProps) {
    const [allSchools, setAllSchools] = useState(initalAllSchools);
    const [selectedState, setSelectedState] = useState(ALL_STATES);
    const [search, setSearch] = useState("");
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(
        () => new Set(initalSelectedSchoolIds),
    );

    const states = useMemo(
        () =>
            Array.from(
                new Set(
                    schools
                        .map((school) => school.state?.trim())
                        .filter((state): state is string => Boolean(state)),
                ),
            ).sort((first, second) => first.localeCompare(second)),
        [schools],
    );

    const schoolsInSelectedState = useMemo(
        () =>
            selectedState === ALL_STATES
                ? schools
                : schools.filter(
                      (school) => school.state === selectedState,
                  ),
        [schools, selectedState],
    );

    const visibleSchools = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) {
            return schoolsInSelectedState;
        }

        return schoolsInSelectedState.filter((school) =>
            school.name.toLowerCase().includes(normalizedSearch),
        );
    }, [schoolsInSelectedState, search]);

    const selectedInStateCount = schoolsInSelectedState.filter((school) =>
        selectedSchoolIds.has(school.id),
    ).length;

    function toggleSchool(schoolId: string) {
        setSelectedSchoolIds((current) => {
            const next = new Set(current);

            if (next.has(schoolId)) {
                next.delete(schoolId);
            } else {
                next.add(schoolId);
            }

            return next;
        });
    }

    function selectCurrentState() {
        if (selectedState === ALL_STATES) {
            return;
        }

        setSelectedSchoolIds((current) => {
            const next = new Set(current);

            for (const school of schoolsInSelectedState) {
                next.add(school.id);
            }

            return next;
        });
    }

    function clearCurrentState() {
        setSelectedSchoolIds((current) => {
            const next = new Set(current);
            const schoolsToClear =
                selectedState === ALL_STATES
                    ? schools
                    : schoolsInSelectedState;

            for (const school of schoolsToClear) {
                next.delete(school.id);
            }

            return next;
        });
    }

    return (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            {!allSchools
                ? Array.from(selectedSchoolIds).map((schoolId) => (
                      <input
                          key={schoolId}
                          type="hidden"
                          name="school_ids"
                          value={schoolId}
                      />
                  ))
                : null}

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold">
                        Eligible Schools
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                        Choose every active school that should be allowed to
                        participate.
                    </p>
                </div>

                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700">
                    {allSchools
                        ? `All ${schools.length} schools`
                        : `${selectedSchoolIds.size} selected`}
                </span>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                <input
                    name="all_schools"
                    type="checkbox"
                    checked={allSchools}
                    onChange={(event) => setAllSchools(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#c8102e]"
                />

                <span>
                    <span className="block text-sm font-semibold text-zinc-900">
                        All Schools
                    </span>
                    <span className="mt-1 block text-xs text-zinc-600">
                        Make this event available to every active school.
                    </span>
                </span>
            </label>

            <div
                className={
                    allSchools
                        ? "mt-5 space-y-4 opacity-50"
                        : "mt-5 space-y-4"
                }
                aria-disabled={allSchools}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-700">
                            Filter by state
                        </span>
                        <select
                            value={selectedState}
                            onChange={(event) => {
                                setSelectedState(event.target.value);
                                setSearch("");
                            }}
                            disabled={allSchools}
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed"
                        >
                            <option value={ALL_STATES}>All states</option>
                            {states.map((state) => (
                                <option key={state} value={state}>
                                    {state}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-700">
                            Search schools
                        </span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            disabled={allSchools}
                            placeholder="Search by school name..."
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed"
                        />
                    </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-sm text-zinc-600">
                        {selectedState === ALL_STATES
                            ? `${schools.length} active schools across all states`
                            : `${selectedInStateCount} of ${schoolsInSelectedState.length} ${selectedState} schools selected`}
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={selectCurrentState}
                            disabled={
                                allSchools || selectedState === ALL_STATES
                            }
                            className="inline-flex h-9 items-center justify-center rounded-md border border-[#c8102e] bg-white px-3 text-xs font-semibold text-[#c8102e] hover:bg-red-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
                        >
                            {selectedState === ALL_STATES
                                ? "Choose a state to select all"
                                : `Select all ${schoolsInSelectedState.length} in ${selectedState}`}
                        </button>

                        <button
                            type="button"
                            onClick={clearCurrentState}
                            disabled={
                                allSchools || selectedSchoolIds.size === 0
                            }
                            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
                        >
                            {selectedState === ALL_STATES
                                ? "Clear all selections"
                                : `Clear ${selectedState}`}
                        </button>
                    </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto rounded-md border border-zinc-200">
                    {visibleSchools.map((school) => (
                        <label
                            key={school.id}
                            className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 hover:bg-zinc-50"
                        >
                            <input
                                type="checkbox"
                                checked={selectedSchoolIds.has(school.id)}
                                onChange={() => toggleSchool(school.id)}
                                disabled={allSchools}
                                className="h-4 w-4 shrink-0 accent-[#c8102e]"
                            />

                            <span className="min-w-0">
                                <span className="block font-medium text-zinc-900">
                                    {school.name}
                                </span>
                                <span className="block text-xs text-zinc-500">
                                    {school.state || "Unknown state"}
                                </span>
                            </span>
                        </label>
                    ))}

                    {visibleSchools.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-zinc-500">
                            No schools match this state and search.
                        </p>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

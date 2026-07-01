"use client";

import Link from "next/link";
import { act, useMemo, useState } from "react";

type ActivityRow = {
    id: string;
    type: string;
    notes: string;
    contactPerson: string;
    activityDate: string;
    followUpDate: string;
    schoolId: string | null;
    schoolName: string;
    state: string;
    rpm: string;
};

type ActivityLogTableProps = {
    activities: ActivityRow[];
};

export function ActivityLogTable({ activities }: ActivityLogTableProps) {
    const [search, setSearch] = useState("");
    const [selectedType, setSelectedType] = useState("all");
    const [selectedState, setSelectedState] = useState("all");
    const [selectedRpm, setSelectedRpm] = useState("all");

    const typeOptions = useMemo(() => {
        return Array.from(new Set(activities.map((activity) => activity.type)))
            .filter(Boolean)
            .sort();
    }, [activities]);

    const stateOptions = useMemo(() => {
        return Array.from(new Set(activities.map((activity) => activity.state)))
            .filter(Boolean)
            .sort();
    }, [activities]);

    const rpmOptions = useMemo(() => {
        return Array.from(new Set(activities.map((activity) => activity.rpm)))
            .filter(Boolean)
            .sort();
    }, [activities]);

    const hasActiveFilters =
        search.trim() !== "" ||
        selectedType ! == "all" ||
        selectedState !== "all" ||
        selectedRpm !== "all";
    
    const clearFilters = () => {
        setSearch("");
        setSelectedType("all");
        setSelectedState("all");
        setSelectedRpm("all");
    };

    const filteredActivities = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        return activities.filter((activity) => {
            const macthesSearch =
                !searchText ||
                activity.notes.toLowerCase().includes(searchText) ||
                activity.type.toLowerCase().includes(searchText) ||
                activity.contactPerson.toLowerCase().includes(searchText) ||
                activity.schoolName.toLowerCase().includes(searchText) ||
                activity.state.toLowerCase().includes(searchText) ||
                activity.rpm.toLowerCase().includes(searchText) ||
                activity.activityDate.toLowerCase().includes(searchText) ||
                activity.followUpDate.toLowerCase().includes(searchText);

            const macthesType =
                selectedType === "all" || activity.type === selectedType;
            
            const macthesState =
                selectedState === "all" || activity.state === selectedState;

            const matchesRpm =
                selectedRpm === "all" || activity.rpm === selectedRpm;

            return macthesSearch && macthesType && macthesState && matchesRpm;
        });
    }, [activities, search, selectedType, selectedState, selectedRpm]);

    return (
        <>  
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_160px_150px_180px_90px]">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                    placeholder="Search activities..."
                />

                <select
                    value={selectedType}
                    onChange={(event) => setSelectedType(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                    <option value="all">All Types</option>
                    {typeOptions.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedState}
                    onChange={(event) => setSelectedState(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                    <option value="all">All States</option>
                    {stateOptions.map((state) => (
                        <option key={state} value={state}>
                            {state}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedRpm}
                    onChange={(event) => setSelectedRpm(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                    <option value="all">All RPMs</option>
                    {rpmOptions.map((rpm) => (
                        <option key={rpm} value={rpm}>
                            {rpm}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="h-10 w-full rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-zinc-700"
                >
                    Clear
                </button>
            </div>

            <div className="mb-6 border-t border-zinc-100 pt-4">
                <p className="text-sm text-zinc-500">
                    Showing {filteredActivities.length} activity records
                </p>
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="w-80 px-4 py-3">Activity</th>
                            <th className="w-44 px-4 py-3">School</th>
                            <th className="w-32 px-4 py-3">Type</th>
                            <th className="w-36 px-4 py-3">Contact</th>
                            <th className="w-40 px-4 py-3">RPM</th>
                            <th className="w-32 px-4 py-3">Date</th>
                            <th className="w-32 px-4 py-3">Follow Up</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredActivities.map((activity) => (
                            <tr
                                key={activity.id}
                                className="border-b border-zinc-100 hover:bg-red-50/60"
                            >
                                <td className="break-words px-4 py-5 font-semibold [overflow-wrap:anywhere]">
                                    {activity.notes}
                                </td>
                                <td className="px-4 py-5">
                                    {activity.schoolId ? (
                                        <Link
                                            href={`/schools/${activity.schoolId}`}
                                            className="font-semibold text-zinc-950 hover:text-[#c8102e]"
                                        >
                                            {activity.schoolName}
                                        </Link>
                                    ) : (
                                        activity.schoolName
                                    )}
                                </td>
                                <td className="px-4 py-5">
                                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]">
                                        {activity.type}
                                    </span>
                                </td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">
                                    {activity.contactPerson}
                                </td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">
                                    {activity.rpm}
                                </td>
                                <td className="px-4 py-5">{activity.activityDate}</td>
                                <td className="px-4 py-5">{activity.followUpDate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid min-w-0 gap-3 md:hidden">
                {filteredActivities.map((activity) => (
                    <article
                        key={activity.id}
                        className="min-w-0 rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                        <p className="break-words text-base font-semibold text-zinc-950 [overflow-wrap:anywhere]">
                            {activity.notes}
                        </p>

                        <p className="mt-2 break-words text-sm text-zinc-500 [overflow-wrap:anywhere]">
                            {activity.schoolName} · {activity.rpm} · {activity.activityDate}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]">
                                {activity.type}
                            </span>

                            {activity.followUpDate !== "N/A" ? (
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                    Follow-up: {activity.followUpDate}
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
                            <div>
                                
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </>
    )
}
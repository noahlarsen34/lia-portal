"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type LiaisonRow = {
    id: string;
    name: string;
    email: string;
    status: string;
    portalAccessStatus: string;
    districts: string[];
};

export function LiaisonsTable({ liaisons }: { liaisons: LiaisonRow[] }) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return liaisons.filter((liaison) => {
            const matchesSearch =
                !query ||
                liaison.name.toLowerCase().includes(query) ||
                liaison.email.toLowerCase().includes(query) ||
                liaison.districts.some((district) =>
                    district.toLowerCase().includes(query),
                );
            const matchesStatus = status === "all" || liaison.status === status;
            return matchesSearch && matchesStatus;
        });
    }, [liaisons, search, status]);

    return (
        <section className="mt-6 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 border-b border-zinc-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search liaisons or districts..."
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 sm:max-w-sm"
                />
                <div className="flex items-center gap-3">
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                    >
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <span className="whitespace-nowrap text-sm text-zinc-500">
                        {filtered.length} of {liaisons.length}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="px-4 py-3 font-semibold">Liaison</th>
                            <th className="px-4 py-3 font-semibold">Districts</th>
                            <th className="px-4 py-3 font-semibold">Account</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((liaison) => (
                            <tr key={liaison.id} className="border-b border-zinc-100 last:border-0">
                                <td className="px-4 py-4">
                                    <div className="font-semibold text-zinc-950">{liaison.name}</div>
                                    <div className="mt-1 text-zinc-600">{liaison.email}</div>
                                </td>
                                <td className="px-4 py-4 text-zinc-700">
                                    {liaison.districts.length
                                        ? liaison.districts.join(", ")
                                        : "No districts"}
                                </td>
                                <td className="px-4 py-4">
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">
                                        {liaison.portalAccessStatus.replaceAll("_", " ")}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span
                                        className={
                                            liaison.status === "active"
                                                ? "rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                                                : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600"
                                        }
                                    >
                                        {liaison.status === "active" ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <Link
                                        href={`/liaisons/${liaison.id}`}
                                        prefetch={false}
                                        className="inline-flex h-8 items-center rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
                                    >
                                        Manage
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    No district liaisons match these filters.
                </div>
            ) : null}
        </section>
    );
}

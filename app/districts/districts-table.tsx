"use client";

import Link from "next/link";
import { useMemo, useState} from "react";

type DistrictRow= {
    id: string;
    name: string;
    state: string | null;
};

type DistrictTableProps = {
    districts: DistrictRow[];
};

export function DistrictsTable({ districts }: DistrictTableProps) {
    const [search, setSearch] = useState("");

    const filteredDistricts = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        if (!searchText) {
            return districts;
        }

        return districts.filter((district) => {
            return (
                district.name.toLowerCase().includes(searchText) ||
                district.state?.toLowerCase().includes(searchText)

            );
        });
    }, [districts, search]);

    return (
        <section className="mt-6 rounded-lg border border-red-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 sm:w-80"
                    placeholder="Search districts..."
                />

                <p className="text-sm text-zinc-500">
                    Showing {filteredDistricts.length} of {districts.length}
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
                            <th className="px-4 py-3 font-semibold">District Name</th>
                            <th className="px-4 py-3 font-semibold">State</th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredDistricts.map((district) => (
                            <tr
                                key={district.id}
                                className="border-b border-zinc-100 last:border-0"
                            >
                                <td className="px-4 py-4 font-semibold">{district.name}</td>
                                <td className="px-4 py-4 text-zinc-600">
                                    {district.state ?? "N/A"}
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex justify-end gap-2">
                                        <Link
                                            href={`/districts/${district.id}/edit`}
                                            className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
                                        >
                                            Edit
                                        </Link>

                                        <Link
                                            href={`/districts/${district.id}/delete`}
                                            className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-red-50"
                                        >
                                            Delete
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredDistricts.length === 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    No districts match your search.
                </div>
            ) : null}
        </section>
    );
}
"use client";

import Link from "next/link";
import { useMemo, useState} from "react";
import { exportDistrictsToGoogleSheet } from "./export-actions";

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
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");

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

    const exportDistrictsGoogleSheet = async () => {
        setIsExporting(true);
        setExportUrl("");
        setExportError("");

        try {
            const result = await exportDistrictsToGoogleSheet(filteredDistricts);
            setExportUrl(result.url);
            window.open(result.url, "_blank", "noopener,noreferrer");
        } catch (error) {
            setExportError(
                error instanceof Error
                    ? error.message
                    : "Could not export districts.",  
            );
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <section className="mt-6 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-3 border-b border-zinc-100 pb-6 lg:flex-row lg:items-center lg:justify-between">
                <input  
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50 lg:max-w-sm"
                    placeholder="Search districts..."
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <p className="text-sm text-zinc-500">
                        Showing {filteredDistricts.length} of {districts.length}
                    </p>

                    <button 
                        type="button"
                        onClick={exportDistrictsGoogleSheet}
                        disabled={filteredDistricts.length === 0 || isExporting}
                        className="h-10 w-full rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {isExporting ? "Exporting..." : "Google Sheet"}
                    </button>
                </div>
            </div>

            {exportUrl ? (
                <div className="mb-4 flex items-center justify-between gap-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <p>
                        Google Sheet created.{" "}
                        <a
                            href={exportUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold underline"
                        >
                            Open export
                        </a>
                    </p>

                    <button 
                        type="button"
                        onClick={() => {
                            setExportUrl("");
                            setExportError("");
                        }}
                        className="rounded-md px-2 py-1 text-sm font-bold text-green-700 hover:bg-green-100"
                        aria-label="Dismiss export confirmation"
                    >
                        x
                    </button>
                </div>
            ) : null}

            {exportError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {exportError}
                </div>
            ) : null}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
                            <th className="w-12 px-4 py-3 font-semibold">#</th>
                            <th className="px-4 py-3 font-semibold">District Name</th>
                            <th className="px-4 py-3 font-semibold">State</th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredDistricts.map((district, index) => (
                            <tr
                                key={district.id}
                                className="border-b border-zinc-100 last:border-0"
                            >
                                <td className="px-4 py-4 text-sm font-semibold text-zinc-400">
                                    {index + 1}
                                </td>
                                <td className="break-words px-4 py-4 font-semibold [overflow-wrap:anywhere]">{district.name}</td>
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

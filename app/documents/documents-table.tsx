"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DocumentRow = {
    id: string;
    schoolId: string;
    name: string;
    documentType: string;
    uploadedAt: string;
    schoolName: string;
    state: string;
    district: string;
    rpm: string;
    signedUrl: string | null;
};

type DocumentsTableProps = {
    documents: DocumentRow[];
    userRole: string;
};

export function DocumentsTable({ documents, userRole }: DocumentsTableProps) {
    const [search, setSearch] = useState("");
    const [selectedType, setSelectedType] = useState("all");
    const [selectedState, setSelectedState] = useState("all");
    const [selectedRpm, setSelectedRpm] = useState("all");

    const isAdmin = userRole === "admin";

    const typeOptions = useMemo(() => {
        return Array.from(
            new Set(documents.map((document) => document.documentType)),
        )
            .filter(Boolean)
            .sort();
    }, [documents]);

    const stateOptions = useMemo(() => {
        return Array.from(new Set(documents.map((document) => document.state)))
            .filter(Boolean)
            .sort();
    }, [documents]);

    const rpmOptions = useMemo(() => {
        return Array.from(new Set(documents.map((document) => document.rpm)))
            .filter(Boolean)
            .sort();
    }, [documents]);

    const clearFilters = () => {
        setSearch("");
        setSelectedType("all");
        setSelectedState("all");
        setSelectedRpm("all");
    };

    const hasActiveFilters =
        search.trim() !== "" ||
        selectedType !== "all" ||
        selectedState !== "all" ||
        (isAdmin && selectedRpm !== "all");

    const filteredDocuments = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        return documents.filter((document) => {
            const matchesSearch =
                !searchText ||
                document.name.toLowerCase().includes(searchText) ||
                document.documentType.toLowerCase().includes(searchText) ||
                document.schoolName.toLowerCase().includes(searchText) ||
                document.state.toLowerCase().includes(searchText) ||
                document.district.toLowerCase().includes(searchText) ||
                document.rpm.toLowerCase().includes(searchText) ||
                document.uploadedAt.toLowerCase().includes(searchText);

            const matchesType =
                selectedType === "all" || document.documentType === selectedType;

            const matchesState =
                selectedState === "all" || document.state === selectedState;

            const matchesRpm =
                !isAdmin || selectedRpm === "all" || document.rpm === selectedRpm;

            return matchesSearch && matchesType && matchesState && matchesRpm;
        });
    }, [documents, search, selectedType, selectedState, selectedRpm, isAdmin]);

    return (
        <>
            <div
                className={
                    isAdmin
                        ? "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_170px_160px_190px_90px]"
                        : "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_170px_160px_90px]"
                }
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                    placeholder="Search documents..."
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

                {isAdmin ? (
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
                ) : null}

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
                    Showing {filteredDocuments.length} document records
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="w-12 px-4 py-3">#</th>
                            <th className="w-64 px-4 py-3">Document</th>
                            <th className="w-36 px-4 py-3">Type</th>
                            <th className="w-56 px-4 py-3">School</th>
                            <th className="w-28 px-4 py-3">State</th>
                            <th className="w-44 px-4 py-3">District</th>
                            <th className="w-40 px-4 py-3">Assigned RPM</th>
                            <th className="w-32 px-4 py-3">Uploaded</th>
                            <th className="w-24 px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredDocuments.map((document, index) => (
                            <tr
                                key={document.id}
                                className="border-b border-zinc-100 hover:bg-red-50/60"
                            >
                                <td className="px-4 py-5 text-sm font-semibold text-zinc-400">
                                    {index + 1}
                                </td>
                                <td className="break-words px-4 py-5 font-semibold [overflow-wrap:anywhere]">
                                    {document.signedUrl ? (
                                        <a
                                            href={document.signedUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-zinc-950 hover:text-[#c8102e] hover:underline"
                                        >
                                            {document.name}
                                        </a>
                                    ) : (
                                        document.name
                                    )}
                                </td>
                                <td className="px-4 py-5">{document.documentType}</td>
                                <td className="px-4 py-5">
                                    <Link
                                        href={`/schools/${document.schoolId}`}
                                        className="font-semibold text-zinc-950 hover:text-[#c8102e]"
                                    >
                                        {document.schoolName}
                                    </Link>
                                </td>
                                <td className="px-4 py-5">{document.state}</td>
                                <td className="px-4 py-5">{document.district}</td>
                                <td className="px-4 py-5">{document.rpm}</td>
                                <td className="px-4 py-5">{document.uploadedAt}</td>
                                <td className="px-4 py-5 text-right">
                                    {document.signedUrl ? (
                                        <a
                                            href={document.signedUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:border-[#c8102e] hover:bg-red-50 hover:text-[#c8102e]"
                                        >
                                            Open
                                        </a>
                                    ) : (
                                        <span className="text-xs font-semibold text-zinc-300">
                                            Unavailable
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredDocuments.length === 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    No documents match your filters.
                </div>
            ) : null}
        </>
    );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { exportContactsToGoogleSheet } from "./export-actions";

type ContactRow = {
    id: string;
    schoolId: string;
    name: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
    phone: string;
    status: string;
    notes: string;
    schoolName: string;
    state: string;
    district: string;
    rpm: string;
};

type ContactsTableProps = {
    contacts: ContactRow[];
    userRole: string;
};

export function ContactsTable({ contacts, userRole }: ContactsTableProps) {
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedState, setSelectedState] = useState("all");
    const [selectedRpm, setSelectedRpm] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");

    const isAdmin = userRole === "admin";
    const statusOptions = ['active', 'inactive'];

    const stateOptions = useMemo(() => {
        return Array.from(new Set(contacts.map((contact) => contact.state)))
            .filter(Boolean)
            .sort();
    }, [contacts]);

    const rpmOptions = useMemo(() => {
        return Array.from(new Set(contacts.map((contact) => contact.rpm)))
            .filter(Boolean)
            .sort();
    }, [contacts]);

    const clearFilters = () => {
        setSearch("");
        setSelectedStatus("all");
        setSelectedState("all");
        setSelectedRpm("all");
    };

    const hasActiveFilters = 
        search.trim() !== "" ||
        selectedStatus !== "all" ||
        selectedState !== "all" ||
        (isAdmin && selectedRpm !== "all");

    const escapeCsvValue = (value: string) => {
        const safeValue = value ?? "";

        if (
            safeValue.includes(",") ||
            safeValue.includes('"') ||
            safeValue.includes("\n")
        ) {
            return `"${safeValue.replaceAll('"', '""')}"`;
        }
        return safeValue;
    };

    const filteredContacts = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        return contacts.filter((contact) => {
            const matchesSearch =
                !searchText ||
                contact.name.toLowerCase().includes(searchText) ||
                contact.firstName.toLowerCase().includes(searchText) ||
                contact.lastName.toLowerCase().includes(searchText) ||
                contact.role.toLowerCase().includes(searchText) ||
                contact.email.toLowerCase().includes(searchText) ||
                contact.phone.toLowerCase().includes(searchText) ||
                contact.schoolName.toLowerCase().includes(searchText) ||
                contact.state.toLowerCase().includes(searchText) ||
                contact.district.toLowerCase().includes(searchText) ||
                contact.rpm.toLowerCase().includes(searchText);
            
            const matchesStatus =
                selectedStatus === "all" || contact.status === selectedStatus;
            
            const matchesState =
                selectedState === "all" || contact.state === selectedState;

            const matchesRpm =
                !isAdmin || selectedRpm === "all" || contact.rpm === selectedRpm;
            
            return matchesSearch && matchesStatus && matchesState && matchesRpm;
        });
    }, [contacts, search, selectedStatus, selectedState, selectedRpm, isAdmin]);

    const exportContactsCsv = () => {
        const headers = [
            "First Name",
            "Last Name",
            "Full Name",
            "Role",
            "Email",
            "Phone",
            "Status",
            "School",
            "State",
            "District",
            "Assigned RPM",
            "Notes",
        ];

        const rows = filteredContacts.map((contact) => [
            contact.firstName,
            contact.lastName,
            contact.name,
            contact.role,
            contact.email,
            contact.phone,
            contact.status,
            contact.schoolName,
            contact.state,
            contact.district,
            contact.rpm,
            contact.notes,
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.map(escapeCsvValue).join(","))
            .join("\n");
        
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `lia-contacts-export-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    };

    const exportContactsGoogleSheet = async () => {
        setIsExporting(true);
        setExportUrl("");
        setExportError("");

        try {
            const result = await exportContactsToGoogleSheet(filteredContacts);
            setExportUrl(result.url);
            window.open(result.url, "_blank", "noopener,noreferrer");
        } catch (error) {
            setExportError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while exporting contacts.",
            );
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <div
                className={
                    isAdmin
                        ? "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_180px_90px]"
                        : "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_90px]"
                }
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                    placeholder="Search contacts..."
                />

                <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm capitalize outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                    <option value="all">All Statuses</option>
                    {statusOptions.map((status) => (
                        <option key={status} value={status}>
                            {status}
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

            <div className="mb-6 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                    Showing {filteredContacts.length} contact records
                </p>

                <button
                    type="button"
                    onClick={exportContactsGoogleSheet}
                    disabled={filteredContacts.length === 0 || isExporting}
                    className="h-10 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isExporting ? "Exporting..." : "Google Sheet"}
                </button>
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
                    onClick={() => {setExportUrl(""); setExportError("")}}
                    className="rounded-md px-2 py-1 text-sm font-bold text-green-700 hover:bg-green-100"
                    aria-label="Dismiss export confirmation"
                    >
                    ×
                    </button>
                </div>
                ) : null}

            {exportError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {exportError}
                </div>
            ) : null}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="w-12 px-4 py-3">#</th>
                            <th className="w-48 px-4 py-3">Contact Name</th>
                            <th className="w-40 px-4 py-3">Role</th>
                            <th className="w-56 px-4 py-3">Email</th>
                            <th className="w-36 px-4 py-3">Phone</th>
                            <th className="w-28 px-4 py-3">Status</th>
                            <th className="w-56 px-4 py-3">School</th>
                            <th className="w-28 px-4 py-3">State</th>
                            <th className="w-44 px-4 py-3">District</th>
                            <th className="w-40 px-4 py-3">Assigned RPM</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredContacts.map((contact, index) => (
                            <tr
                                key={contact.id}
                                className="border-b border-zinc-100 hover:bg-red-50/60"
                            >
                                <td className="px-4 py-5 text-sm font-semibold text-zinc-400">
                                    {index + 1}
                                </td>
                                <td className="px-4 py-5 font-semibold">
                                    <Link
                                        href={`/schools/${contact.schoolId}/contacts/${contact.id}`}
                                        className="text-zinc-950 hover:text-[#c8102e]"
                                    >
                                        {contact.name}
                                    </Link>
                                </td>
                                <td className="px-4 py-5">{contact.role}</td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">
                                    {contact.email}
                                </td>
                                <td className="px-4 py-5">{contact.phone}</td>
                                <td className="px-4 py-5">
                                    <span
                                        className={
                                            contact.status === "active"
                                                ? "whitespace-nowrap rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700"
                                                : "whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]"
                                        }
                                    >
                                        {contact.status}
                                    </span>
                                </td>
                                <td className="px-4 py-5">
                                    <Link
                                        href={`/schools/${contact.schoolId}`}
                                        className="font-semibold text-zinc-950 hover:text-[#c8102e]"
                                    >
                                        {contact.schoolName}
                                    </Link>
                                </td>
                                <td className="px-4 py-5">{contact.state}</td>
                                <td className="px-4 py-5">{contact.district}</td>
                                <td className="px-4 py-5">{contact.rpm}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredContacts.length === 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    No contacts match your filters.
                </div>
            ) : null}
        </>
    );
}

"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { exportContactsToGoogleSheet } from "./export-actions";

type ContactRow = {
    id: string;
    schoolId: string | null;
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
    const [selectedRole, setSelectedRole] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");

    const isAdmin = userRole === "admin";

    const isMailableEmail = (email: string) => {
        return email.trim() !== "" && email !== "N/A";
    };

    const isTextablePhone = (phone: string) => {
        return phone.trim() !== "" && phone !== "N/A";
    };

    const getPhoneHref = (phone: string) => {
        return `tel:${phone.replace(/[^\d+]/g, "")}`;
    };

    const statusOptions = ["active", "inactive"];

    const stateOptions = useMemo(() => {
        return Array.from(new Set(contacts.map((contact) => contact.state)))
            .filter(Boolean)
            .sort();
    }, [contacts]);

    const roleOptions = useMemo(() => {
        return Array.from(new Set(contacts.map((contact) => contact.role)))
            .filter(Boolean)
            .sort();
    }, [contacts]);

    const rpmOptions = useMemo(() => {
        return Array.from(new Set(contacts.map((contact) => contact.rpm)))
            .filter((rpm) => rpm && rpm !== "N/A")
            .sort();
    }, [contacts]);

    const clearFilters = () => {
        setSearch("");
        setSelectedStatus("all");
        setSelectedRole("all");
        setSelectedState("all");
        setSelectedRpm("all");
        setExportError("");
    };

    const hasActiveFilters =
        search.trim() !== "" ||
        selectedStatus !== "all" ||
        selectedRole !== "all" ||
        selectedState !== "all" ||
        (isAdmin && selectedRpm !== "all");

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
            
            const matchesRole = 
                selectedRole === "all" || contact.role === selectedRole;

            const matchesRpm =
                !isAdmin || selectedRpm === "all" || contact.rpm === selectedRpm;

            return matchesSearch && matchesStatus && matchesRole && matchesState && matchesRpm;
        });
    }, [contacts, search, selectedStatus, selectedRole, selectedState, selectedRpm, isAdmin]);

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
                        ? "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_170px_150px_180px_90px]"
                        : "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_170px_150px_90px]"
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
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                    <option value="all">All Roles</option>
                    {roleOptions.map((role) => (
                        <option key={role} value={role}>
                            {role}
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
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    <Download className="h-4 w-4" aria-hidden />
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

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1460px] border-collapse text-left text-sm">
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
                            {isAdmin ? (
                                <th className="w-36 px-4 py-3 text-right">
                                    Actions
                                </th>
                            ) : null}
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
                                <td className="break-words px-4 py-5 font-semibold [overflow-wrap:anywhere]">
                                    {contact.schoolId ? (
                                        <Link
                                            href={`/schools/${contact.schoolId}/contacts/${contact.id}`}
                                            className="text-zinc-950 hover:text-[#c8102e]"
                                        >
                                            {contact.name}
                                        </Link>
                                    ) : (
                                        <span>{contact.name}</span>
                                    )}
                                </td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">{contact.role}</td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">
                                    {isMailableEmail(contact.email) ? (
                                        <a
                                            href={`mailto:${contact.email}`}
                                            className="text-zinc-700 hover:text-[#c8102e] hover:underline"
                                        >
                                            {contact.email}
                                        </a>
                                    ) : (
                                        contact.email
                                    )}
                                </td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">
                                    {isTextablePhone(contact.phone) ? (
                                        <a
                                            href={getPhoneHref(contact.phone)}
                                            className="text-zinc-700 hover:text-[#c8102e] hover:underline"
                                        >
                                            {contact.phone}
                                        </a>
                                    ) : (
                                        contact.phone
                                    )}
                                </td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">
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
                                    {contact.schoolId ? (
                                        <Link
                                            href={`/schools/${contact.schoolId}`}
                                            className="font-semibold text-zinc-950 hover:text-[#c8102e]"
                                        >
                                            {contact.schoolName}
                                        </Link>
                                    ) : (
                                        <span className="font-semibold text-zinc-700">
                                            {contact.schoolName}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-5">{contact.state}</td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">{contact.district}</td>
                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">{contact.rpm}</td>
                                {isAdmin ? (
                                    <td className="px-4 py-5">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/contacts/${contact.id}/edit`}
                                                className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
                                            >
                                                Edit
                                            </Link>
                                            <Link
                                                href={`/contacts/${contact.id}/delete`}
                                                className="inline-flex h-9 items-center rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-[#c8102e] hover:bg-red-50"
                                            >
                                                Delete
                                            </Link>
                                        </div>
                                    </td>
                                ) : null}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid min-w-0 gap-3 md:hidden">
                {filteredContacts.map((contact) => (
                    <article
                        key={contact.id}
                        className="min-w-0 rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                        <div className="flex min-w-0 flex-col gap-3">
                            <div className="min-w-0">
                                {contact.schoolId ? (
                                    <Link
                                        href={`/schools/${contact.schoolId}/contacts/${contact.id}`}
                                        className="break-words text-base font-semibold text-zinc-950 hover:text-[#c8102e] [overflow-wrap:anywhere]"
                                    >
                                        {contact.name}
                                    </Link>
                                ) : (
                                    <p className="break-words text-base font-semibold text-zinc-950 [overflow-wrap:anywhere]">
                                        {contact.name}
                                    </p>
                                )}

                                <p className="mt-1 break-words text-sm text-zinc-500 [overflow-wrap:anywhere]">
                                    {isMailableEmail(contact.email) ? (
                                        <a
                                            href={`mailto:${contact.email}`}
                                            className="hover:text-[#c8102e] hover:underline"
                                        >
                                            {contact.email}
                                        </a>
                                    ) : (
                                        contact.email
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span 
                                    className={
                                        contact.status === "active"
                                            ? "w-fit rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700"
                                            : "w-fit rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]"
                                    }
                                >
                                    {contact.status}
                                </span>

                                <span className="w-fit rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                                    {contact.role}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs uppercase text-zinc-500">Phone</p>
                                <p className="mt-1 break-words font-semibold [overflow-wrap:anywhere]">
                                    {isTextablePhone(contact.phone) ? (
                                        <a
                                            href={getPhoneHref(contact.phone)}
                                            className="hover:text-[#c8102e] hover:underline"
                                        >
                                            {contact.phone}
                                        </a>
                                    ) : (
                                        contact.phone
                                    )}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase text-zinc-500">State</p>
                                <p className="mt-1 font-semibold">{contact.state}</p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
                            <div>
                                <p className="text-xs uppercase text-zinc-500">School</p>
                                {contact.schoolId ? (
                                    <Link
                                        href={`/schools/${contact.schoolId}`}
                                        className="mt-1 block break-words font-semibold text-zinc-950 hover:text-[#c8102e] [overflow-wrap:anywhere]"
                                    >
                                        {contact.schoolName}
                                    </Link>
                                ) : (
                                    <p className="mt-1 break-words font-semibold text-zinc-700 [overflow-wrap:anywhere]">
                                        {contact.schoolName}
                                    </p>
                                )}
                            </div>

                            <div>
                                <p className="text-xs uppercase text-zinc-500">District</p>
                                <p className="mt-1 break-words font-semibold [overflow-wrap:anywhere]">
                                    {contact.district}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase text-zinc-500">Assigned RPM</p>
                                <p className="mt-1 break-words font-semibold [overflow-wrap:anywhere]">
                                    {contact.rpm}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2">
                            {contact.schoolId ? (
                                <Link
                                    href={`/schools/${contact.schoolId}/contacts/${contact.id}`}
                                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                                >
                                    View Contact
                                </Link>
                            ) : null}

                            {isAdmin ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <Link
                                        href={`/contacts/${contact.id}/edit`}
                                        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
                                    >
                                        Edit
                                    </Link>

                                    <Link
                                        href={`/contacts/${contact.id}/delete`}
                                        className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-[#c8102e] hover:bg-red-50"
                                    >
                                        Delete
                                    </Link>
                                </div>
                            ) : null}
                        </div>
                    </article>
                ))}
            </div>

          
              {filteredContacts.length === 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    No contacts match your filters.
                </div>
            ) : null}
                        
        </>
    );
}

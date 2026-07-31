"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { exportUsersToGoogleSheet } from "./export-actions";

type UserRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    assignedSchools: number;
};

type UsersTableProps = {
    users: UserRow[];
};

export function UsersTable({ users }: UsersTableProps) {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");
    const isMailableEmail = (email: string) => {
        return email.trim() !== "" && email !== "No email listed";
    };

    const filteredUsers = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchesSearch = 
                user.name.toLowerCase().includes(searchText) ||
                user.email.toLowerCase().includes(searchText) ||
                user.role.toLowerCase().includes(searchText);

            const matchesRole =
                roleFilter === "all" || user.role.toLowerCase() === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter])

    const exportUsersGoogleSheet = async () => {
        setIsExporting(true);
        setExportUrl("");
        setExportError("");

        try {
            const result = await exportUsersToGoogleSheet(filteredUsers);
            setExportUrl(result.url);
            window.open(result.url, "_blank", "noopener,noreferrer");
        } catch (error) {
            setExportError(
                error instanceof Error ? error.message : "Could not export users.",
            );
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <section className="rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-3 border-b border-zinc-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 lg:max-w-sm"
                    placeholder="Search users..."
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <select
                        value={roleFilter}
                        onChange={(event) => setRoleFilter(event.target.value)}
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 sm:w-48"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="rpm">RPM</option>
                    </select>

                    <p className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-zinc-50 px-3 text-sm font-medium text-zinc-600">
                        {filteredUsers.length} of {users.length}
                    </p>
                    
                    <button
                        type="button"
                        onClick={exportUsersGoogleSheet}
                        disabled={isExporting || filteredUsers.length === 0}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <Download className="h-4 w-4" aria-hidden />
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
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
                            <th className="px-4 py-3 font-semibold">Name</th>
                            <th className="px-4 py-3 font-semibold">Email</th>
                            <th className="px-4 py-3 font-semibold">Role</th>
                            <th className="px-4 py-3 font-semibold">Assigned</th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredUsers.map((user)=> (
                            <tr
                                key={user.id}
                                className="border-b border-zinc-100 last:border-0"
                            >
                                <td className="break-words px-4 py-4 font-semibold [overflow-wrap:anywhere]">{user.name}</td>
                                <td className="break-words px-4 py-4 text-zinc-600 [overflow-wrap:anywhere]">
                                    {isMailableEmail(user.email) ? (
                                        <a
                                            href={`mailto:${user.email}`}
                                            className="hover:text-[#c8102e] hover:underline"
                                        >
                                            {user.email}
                                        </a>
                                    ) : (
                                        user.email
                                    )}
                                </td>
                                <td className="px-4 py-4">
                                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-zinc-600">
                                    {user.assignedSchools}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <Link
                                        href={`/users/${user.id}`}
                                        className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredUsers.length === 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    No users match your search.
                </div>
            ) : null}
        </section>
    );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from 'react';
import { exportTeachersToGoogleSheet } from "./export-actions";

type TeacherRow = {
    id: string;
    schoolId: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    username: string;
    passwordStatus: string;
    isNewTeacher: boolean;
    schoolName: string;
    state: string;
    district: string;
    rpm: string;
};

type TeacherTableProps = {
    teachers: TeacherRow[];
    userRole: string;
};

export function TeachersTable({ teachers, userRole }: TeacherTableProps) {
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedState, setSelectedState] = useState("all");
    const [selectedRpm, setSelectedRpm] = useState("all");
    const [selectedNewTeacher, setSelectedNewTeacher] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");

    const isAdmin = userRole === "admin";
    const statusOptions = ["active", "inactive"];

    const stateOptions = useMemo(() => {
        return Array.from(new Set(teachers.map((teacher) => teacher.state)))
            .filter(Boolean)
            .sort();
    }, [teachers]);

    const rpmOptions = useMemo(() => {
        return Array.from(new Set(teachers.map((teacher) => teacher.rpm)))
            .filter(Boolean)
            .sort();
    }, [teachers]);

    const clearFilters = () => {
        setSearch("");
        setSelectedStatus("all");
        setSelectedState("all");
        setSelectedRpm("all");
        setSelectedNewTeacher("all");
    };

    const exportTeachersGoogleSheet = async () => {
        setIsExporting(true);
        setExportUrl("");
        setExportError("");

        try {
            const result = await exportTeachersToGoogleSheet(filteredTeachers);
            setExportUrl(result.url);
            window.open(result.url, "_blank", "noopener,noreferrer");
        } catch (error) {
            setExportError (
                error instanceof Error ? error.message : "Could not export teachers.",
            );
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters =
        search.trim() !== "" ||
        selectedStatus !== "all" ||
        selectedState !== "all" ||
        (isAdmin && selectedRpm !== "all") ||
        selectedNewTeacher !== "all";
    
    const filteredTeachers = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        return teachers.filter((teacher) => {
            const matchesSearch =
                !searchText ||
                teacher.name.toLowerCase().includes(searchText) ||
                teacher.firstName.toLowerCase().includes(searchText) ||
                teacher.lastName.toLowerCase().includes(searchText) ||
                teacher.email.toLowerCase().includes(searchText) ||
                teacher.phone.toLowerCase().includes(searchText) ||
                teacher.username.toLowerCase().includes(searchText) ||
                teacher.schoolName.toLowerCase().includes(searchText) ||
                teacher.state.toLowerCase().includes(searchText) ||
                teacher.district.toLowerCase().includes(searchText) ||
                teacher.rpm.toLowerCase().includes(searchText);
            
            const matchesStatus =
                selectedStatus === "all" || teacher.status === selectedStatus;

            const matchesState =
                selectedState === "all" || teacher.state === selectedState;

            const matchesRpm =
                !isAdmin || selectedRpm === "all" || teacher.rpm === selectedRpm;
            
            const matchesNewTeacher =
                selectedNewTeacher === "all" ||
                (selectedNewTeacher === "yes" && teacher.isNewTeacher) ||
                (selectedNewTeacher === "no" && !teacher.isNewTeacher);

            return (
                matchesSearch &&
                matchesStatus &&
                matchesState &&
                matchesRpm &&
                matchesNewTeacher 
            );

        });
    }, [
        teachers,
        search,
        selectedStatus,
        selectedState,
        selectedRpm,
        selectedNewTeacher,
        isAdmin,
    ]);

    return (
        <>
            <div
                className={
                    isAdmin
                        ? "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_180px_160px_90px]"
                        : "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_160px_90px]"
                }
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                    placeholder="Search teachers..."
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

                <select 
                    value={selectedNewTeacher}
                    onChange={(event) => setSelectedNewTeacher(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                    <option value="all">All Teachers</option>
                    <option value="yes">New Teachers</option>
                    <option value="no">Returning Teachers</option>
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

            <div className="mb-6 flex items-center justify-between border-t border-zinc-100 pt-4">
                <p className="text-sm text-zinc-500">
                    Showing {filteredTeachers.length} teacher records
                </p>

                <button
                    type="button"
                    onClick={exportTeachersGoogleSheet}
                    disabled={isExporting || filteredTeachers.length === 0}
                    className="h-10 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isExporting ? "Exporting..." : "Export Google Sheet"}
                </button>
                </div>

                {exportUrl ? (
                <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Teacher export created.{" "}
                    <a className="font-semibold underline" href={exportUrl} target="_blank">
                    Open Google Sheet
                    </a>
                </p>
                ) : null}

                {exportError ? (
                <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {exportError}
                </p>
                ) : null}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="w-12 px-4 py-3">#</th>
                            <th className="w-48 px-4 py-3">Teacher Name</th>
                            <th className="w-56 px-4 py-3">Email</th>
                            <th className="w-36 px-4 py-3">Phone</th>
                            <th className="w-28 px-4 py-3">Status</th>
                            <th className="w-32 px-4 py-3">New Teacher</th>
                            <th className="w-40 px-4 py-3">Password</th>
                            <th className="w-56 px-4 py-3">School</th>
                            <th className="w-28 px-4 py-3">State</th>
                            <th className="w-44 px-4 py-3">District</th>
                            <th className="w-40 px-4 py-3">Assigned RPM</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredTeachers.map((teacher, index) => (
                            <tr
                                key={teacher.id}
                                className="border-b border-zinc-100 hover:bg-red-50/60"
                            >
                                <td className="px-4 py-5 text-sm font-semibold text-zinc-400">
                                    {index + 1}
                                </td>
                                <td className="px-4 py-5 font-semibold">
                                    <Link
                                        href={`/schools/${teacher.schoolId}/teachers/${teacher.id}`}
                                        className="text-zinc-950 hover:text-[#c8102e]"
                                    >
                                        {teacher.name}
                                    </Link>
                                </td>

                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">
                                    {teacher.email}
                                </td>

                                <td className="px-4 py-5">{teacher.phone}</td>

                                <td className="px-4 py-5">
                                    <span
                                        className={
                                            teacher.status === "active"
                                                ? "whitespace-nowrap rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700"
                                                : "whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]"
                                        }
                                    >
                                        {teacher.status}
                                    </span>
                                </td>

                                <td className="px-4 py-5">
                                    <span
                                        className={
                                            teacher.isNewTeacher
                                                ? "whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]"
                                                : "whitespace-nowrap rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600"
                                        }
                                    >
                                        {teacher.isNewTeacher ? "Yes" : "No"}
                                    </span>
                                </td>

                                <td className="px-4 py-5">
                                    <span className="whitespace-nowrap rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase text-zinc-600">
                                        {teacher.passwordStatus}
                                    </span>
                                </td>

                                <td className="px-4 py-5">
                                    <Link
                                        href={`/schools/${teacher.schoolId}`}
                                        className="font-semibold text-zinc-950 hover:text-[#c8102e]"
                                    >
                                        {teacher.schoolName}
                                    </Link>
                                </td>

                                <td className="px-4 py-5">{teacher.state}</td>
                                <td className="px-4 py-5">{teacher.district}</td>
                                <td className="px-4 py-5">{teacher.rpm}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredTeachers.length === 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    No teachers match your filters.
                </div>
            ) : null}
        </>
    );

}

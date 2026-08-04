"use client";

import { Download } from "lucide-react";
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
    programLevel: string;
    passwordStatus: string;
    portalAccessStatus: string;
    invitedAt: string | null;
    activatedAt: string | null;
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

function normalizeSearchValue(value: unknown) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9@.+]+/g, " ")
        .trim()
        .toLowerCase();
}

const programLevelOptions = [
    { value: "elementary", label: "Elementary" },
    { value: "middle", label: "Middle School" },
    { value: "high", label: "High School" },
    { value: "k_8", label: "K-8" },
    { value: "k_12", label: "K-12" },
    { value: "other", label: "Other" },
    { value: "unknown", label: "Unknown" },
];

export function TeachersTable({ teachers, userRole }: TeacherTableProps) {
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedState, setSelectedState] = useState("all");
    const [selectedRpm, setSelectedRpm] = useState("all");
    const [selectedNewTeacher, setSelectedNewTeacher] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");
    const [selectedPortalAccess, setSelectedPortalAccess] = useState("all");
    const [selectedProgramLevel, setSelectedProgramLevel] = useState("all");

    const isAdmin = userRole === "admin";
    const statusOptions = ["active", "inactive"];
    const isMailableEmail = (email: string) => {
        return email.trim() !== "" && email !== "N/A";
    };
    const isTextablePhone = (phone: string) => {
        return phone.trim() !== "" && phone !== "N/A";
    };
    const getPhoneHref = (phone: string) => {
        return `tel:${phone.replace(/[^\d+]/g, "")}`;
    };

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

    const getPortalAccessLabel = (status: string) => {
        switch (status) {
            case "invited":
                return "Invited";
            case "active":
                return "Activated";
            case "disabled":
                return "Disabled";
            case "not_invited":
            default:
                return "Not Invited";
        }
    };

    const getPortalAccessClassName = (status: string) => {
        switch (status) {
            case "invited":
                return "whitespace-nowrap rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700";
            case "active":
                return "whitespace-nowrap rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700";
            case "disabled":
                return "whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700";
            case "not_invited":
            default:
                return "whitespace-nowrap rounded-full bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-600";
        }
    }

    const clearFilters = () => {
        setSearch("");
        setSelectedStatus("all");
        setSelectedState("all");
        setSelectedRpm("all");
        setSelectedNewTeacher("all");
        setSelectedPortalAccess("all");
        setSelectedProgramLevel("all");
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
        selectedNewTeacher !== "all" ||
        selectedPortalAccess !== "all" ||
        selectedProgramLevel !== "all";
    
    const filteredTeachers = useMemo(() => {
        const searchTerms = normalizeSearchValue(search)
            .split(/\s+/)
            .filter(Boolean);

        return teachers.filter((teacher) => {
            const searchableTeacher = normalizeSearchValue([
                teacher.name,
                teacher.firstName,
                teacher.lastName,
                teacher.email,
                teacher.phone,
                teacher.username,
                teacher.schoolName,
                teacher.state,
                teacher.district,
                teacher.rpm,
                teacher.programLevel,
            ].join(" "));

            const matchesSearch =
                searchTerms.length === 0 ||
                searchTerms.every((term) => searchableTeacher.includes(term));

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

            const matchesPortalAccess =
                selectedPortalAccess === "all" ||
                teacher.portalAccessStatus === selectedPortalAccess;
            
            const matchesProgramLevel =
                selectedProgramLevel === "all" ||
                teacher.programLevel === selectedProgramLevel;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesState &&
                matchesRpm &&
                matchesNewTeacher &&
                matchesPortalAccess &&
                matchesProgramLevel
            );

        });
    }, [
        teachers,
        search,
        selectedStatus,
        selectedState,
        selectedRpm,
        selectedNewTeacher,
        selectedPortalAccess,
        selectedProgramLevel,
        isAdmin,
    ]);

    return (
        <>
            <div
                className={
                    isAdmin
                        ? "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8"
                        : "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7"
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
                    value={selectedProgramLevel}
                    onChange={(event) =>
                        setSelectedProgramLevel(event.target.value)
                    }
                    aria-label="Filter by program level"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                    {programLevelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
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

                <select
                    value={selectedPortalAccess}
                    onChange={(event) => setSelectedPortalAccess(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                    <option value="all">All Portal Access</option>
                    <option value="not_invited">Not Invited</option>
                    <option value="invited">Invited</option>
                    <option value="active">Activated</option>
                    <option value="disabled">Disabled</option>
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

            <div className="mb-6 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                    Showing {filteredTeachers.length} teacher records
                </p>

                <button
                    type="button"
                    onClick={exportTeachersGoogleSheet}
                    disabled={isExporting || filteredTeachers.length === 0}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    <Download className="h-4 w-4" aria-hidden />
                    {isExporting ? "Exporting..." : "Google Sheet"}
                </button>
                </div>

                {exportUrl ? (
                    <div className='mb-4 flex items-center justify-between gap-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
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
                            onClick={() => {setExportUrl(""); setExportError("");}}
                            className="rounded-md px-2 py-1 text-sm font-bold text-green-700 hover:bg-green-100"
                            aria-label="Dismiss export confirmation"
                        >
                            ×
                        </button>
                    </div>
                ) : null }

                {exportError ? (
                <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {exportError}
                </p>
                ) : null}

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="w-12 px-4 py-3">#</th>
                            <th className="w-48 px-4 py-3">Teacher Name</th>
                            <th className="w-56 px-4 py-3">Email</th>
                            <th className="w-36 px-4 py-3">Phone</th>
                            <th className="w-28 px-4 py-3">Status</th>
                            <th className="w-32 px-4 py-3">New Teacher</th>
                            <th className="w-40 px-4 py-3">Portal Access</th>
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
                                    {isMailableEmail(teacher.email) ? (
                                        <a
                                            href={`mailto:${teacher.email}`}
                                            className="text-zinc-700 hover:text-[#c8102e] hover:underline"
                                        >
                                            {teacher.email}
                                        </a>
                                    ) : (
                                        teacher.email
                                    )}
                                </td>

                                <td className="break-words px-4 py-5 [overflow-wrap:anywhere]">
                                    {isTextablePhone(teacher.phone) ? (
                                        <a
                                            href={getPhoneHref(teacher.phone)}
                                            className="text-zinc-700 hover:text-[#c8102e] hover:underline"
                                        >
                                            {teacher.phone}
                                        </a>
                                    ) : (
                                        teacher.phone
                                    )}
                                </td>

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
                                    <span
                                        className={getPortalAccessClassName(
                                            teacher.portalAccessStatus,
                                        )}
                                    >
                                        {getPortalAccessLabel(teacher.portalAccessStatus)}
                                    </span>

                                    {teacher.portalAccessStatus === "invited" &&
                                    teacher.invitedAt ? (
                                        <p className="mt-2 whitespace-nowrap text-xs text-zinc-500">
                                            {new Intl.DateTimeFormat("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            }).format(new Date(teacher.invitedAt))}
                                        </p>
                                    ) : null}
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

            <div className="grid min-w-0 gap-3 md:hidden">
                {filteredTeachers.map((teacher) => (
                    <article    
                        key={teacher.id}
                        className="min-w-0 rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                        <div className="flex min-w-0 flex-col gap-3">
                            <div className="min-w-0">
                                <Link
                                    href={`/schools/${teacher.schoolId}/teachers/${teacher.id}`}
                                    className="break-words text-base font-semibold text-zinc-950 hover:text-[#c8102e] [overflow-wrap:anywhere]"
                                >
                                    {teacher.name}
                                </Link>
                                <p className="mt-1 break-words text-sm text-zinc-500 [overflow-wrap:anywhere]">
                                    {isMailableEmail(teacher.email) ? (
                                        <a
                                            href={`mailto:${teacher.email}`}
                                            className="hover:text-[#c8102e] hover:underline"
                                        >
                                            {teacher.email}
                                        </a>
                                    ) : (
                                        teacher.email
                                    )}
                                </p>
                            </div>

                            <span
                                className= {
                                    teacher.status === "active"
                                        ? "w-fit rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700"
                                        : "w-fit rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]"
                                }
                            >
                                {teacher.status}
                            </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <span
                                className={
                                    teacher.isNewTeacher
                                        ? "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]"
                                        : "rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600"
                                }
                            >
                                {teacher.isNewTeacher ? "New Teacher" : "Returning"}
                            </span>

                            <span
                                className={getPortalAccessClassName(
                                    teacher.portalAccessStatus,
                                )}
                            >
                                {getPortalAccessLabel(teacher.portalAccessStatus)}
                            </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs uppercase text-zinc-500">Phone</p>
                                <p className="mt-1 break-words font-semibold [overflow-wrap:anywhere]">
                                    {isTextablePhone(teacher.phone) ? (
                                        <a
                                            href={getPhoneHref(teacher.phone)}
                                            className="hover:text-[#c8102e] hover:underline"
                                        >
                                            {teacher.phone}
                                        </a>
                                    ) : (
                                        teacher.phone
                                    )}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase text-zinc-500">State</p>
                                <p className="mt-1 font-semibold">{teacher.state}</p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
                            <div>
                                <p className="text-xs uppercase text-zinc-500">School</p>
                                <Link
                                    href={`/schools/${teacher.schoolId}`}
                                    className="mt-1 block break-words font-semibold text-zinc-950 hover:text-[#c8102e] [overflow-wrap:anywhere]"
                                >
                                    {teacher.schoolName}
                                </Link>
                            </div>

                            <div>
                                <p className="text-xs uppercase text-zinc-500">District</p>
                                <p className="mt-1 break-words font-semibold [overflow-wrap:anywhere]">
                                    {teacher.district}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase text-zinc-500">Assigned RPM</p>
                                <p className="mt-1 break-words font-semibold [overflow-wrap:anywhere]">
                                    {teacher.rpm}
                                </p>
                            </div>
                        </div>

                        <Link
                            href={`/schools/${teacher.schoolId}/teachers/${teacher.id}`}
                            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            View Teacher
                        </Link>
                    </article>
                ))}
            </div>

            {filteredTeachers.length === 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    No teachers match your filters.
                </div>
            ) : null}
        </>
    );

}

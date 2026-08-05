"use client";

import { ChevronDown, Download, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import type { ChangeEventHandler, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { exportSchoolsToGoogleSheet } from './export-actions';
import { getSchoolLifeCycleStatus } from '@/utils/school-status';

type SchoolRow = {
    id: string;
    name: string;
    year_lia_started: number | null;
    address: string | null;
    state: string;
    region: string | null;
    district: string;
    rpm: string;
    schoolLevel: string;
    status: string;
    mouStatus: string;
    updatedAt: string;
    lastContactAt: string | null;
};

type SchoolsTableProps = {
    schools: SchoolRow[];
};

type FilterSelectProps = {
    label: string;
    value: string;
    onChange: ChangeEventHandler<HTMLSelectElement>;
    children: ReactNode;
    capitalize?: boolean;
};

function FilterSelect({
    label,
    value,
    onChange,
    children,
    capitalize = false,
}: FilterSelectProps) {
    const isActive = value !== "all";

    return (
        <label className="relative block min-w-0">
            <span className="sr-only">{label}</span>
            <select
                value={value}
                onChange={onChange}
                className={`h-11 w-full appearance-none rounded-lg border bg-white pl-3.5 pr-10 text-sm font-medium outline-none shadow-sm transition focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 ${
                    isActive
                        ? "border-red-300 bg-red-50 text-[#a70d25]"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                } ${capitalize ? "capitalize" : ""}`}
            >
                {children}
            </select>
            <ChevronDown
                className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                    isActive ? "text-[#c8102e]" : "text-zinc-400"
                }`}
                aria-hidden
            />
        </label>
    );
}

export function SchoolsTable({ schools }: SchoolsTableProps) {
    const [search, setSearch] = useState("");
    const [selectedState, setSelectedState] = useState("all");
    const [selectedRegion, setSelectedRegion] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedRpm, setSelectedRpm] = useState("all");
    const [selectedMouStatus, setSelectedMouStatus] = useState("all");
    const [selectedSchoolLevel, setSelectedSchoolLevel] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");
    const [selectedSchoolType, setSelectedSchoolType] = useState("all");

    const hasAddress = (address: string | null) => {
        return Boolean(address?.trim());
    };

    const getDirectionsHref = (school: SchoolRow) => {
        const destination = [school.name, school.address, school.state]
            .filter(Boolean)
            .join(", ");
        
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    }

    const getActivityLogHref = (school: SchoolRow) => {
        return `/activity-log?school=${encodeURIComponent(school.id)}`;
    };

    const stateOptions = useMemo(() => {
        return Array.from(new Set(schools.map((school) => school.state)))
            .filter(Boolean)
            .sort();
    }, [schools]);

    const regionOptions = ["North", "South", "East", "West", "Central", "N/A"];

    const statusOptions = ["active", 'inactive', 'interested', 'pending'];

    const rpmOptions = useMemo(() => {
    return Array.from(new Set(schools.map((school) => school.rpm)))
        .filter(Boolean)
        .sort();
        }, [schools]);
    
    const schoolLevelOptions = [
        { value: "elementary", label: "Elementary" },
        { value: "middle", label: "Middle School" },
        { value: "high", label: "High School" },
        { value: "middle_high", label: "Middle + High School" },
        { value: "k_8", label: "K-8" },
        { value: "k_12", label: "K-12" },
        { value: "other", label: "Other"},
        { value: "unknown", label: "Unknown"},
    ];

    const formatSchoolLevel = (schoolLevel: string) => {
        return (
            schoolLevelOptions.find((level) => level.value === schoolLevel)?.label ??
            "Unknown"
        );
    };

    const formatDate = (date: string | null) => {
        if (!date) {
            return "N/A";
        }

        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const mouStatusOptions = ["signed", "pending", "not signed"];

    const clearFilters = () => {
        setSearch("");
        setSelectedState("all");
        setSelectedRegion("all");
        setSelectedStatus("all");
        setSelectedRpm("all");
        setSelectedSchoolLevel("all");
        setSelectedMouStatus("all");
        setSelectedSchoolType("all");
    };

    const exportSchoolsGoogleSheet = async () => {
        setIsExporting(true);
        setExportUrl("");
        setExportError("");

        try {
            const result = await exportSchoolsToGoogleSheet(filteredSchools);
            setExportUrl(result.url);
            window.open(result.url, "_blank", "noopener,noreferrer");
        } catch (error) {
            setExportError(
                error instanceof Error ? error.message : "Could not export schools.",
            );
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters =
        search.trim() !== "" ||
        selectedState !== "all" ||
        selectedRegion !== "all" ||
        selectedStatus !== "all" ||
        selectedRpm !== "all" ||
        selectedSchoolLevel !== "all" ||
        selectedMouStatus !== "all" ||
        selectedSchoolType !== "all";

    const searchText = search.trim().toLowerCase();

    const filteredSchools = schools.filter((school) => {
            const matchesSearch =
                !searchText ||
                school.name.toLowerCase().includes(searchText) ||
                school.address?.toLowerCase().includes(searchText) ||
                school.state.toLowerCase().includes(searchText) ||
                school.region?.toLowerCase().includes(searchText) ||
                school.district.toLowerCase().includes(searchText) ||
                school.rpm.toLowerCase().includes(searchText) ||
                school.schoolLevel.toLowerCase().includes(searchText) ||
                school.status.toLowerCase().includes(searchText) ||
                school.mouStatus.toLowerCase().includes(searchText);

            const matchesState =
                selectedState === "all" || school.state === selectedState;

            const schoolRegion = school.region ?? "N/A";

            const matchesRegion =
                selectedRegion === "all" || schoolRegion === selectedRegion;
            
            const matchesStatus =
                selectedStatus === "all" || school.status === selectedStatus;
                
            const matchesRpm =
                selectedRpm === "all" || school.rpm === selectedRpm;
            
            const matchesSchoolLevel =
                selectedSchoolLevel === "all" || school.schoolLevel === selectedSchoolLevel;
            
            const matchesMouStatus =
                selectedMouStatus === "all" || school.mouStatus === selectedMouStatus;

            const schoolLifeCycleStatus = getSchoolLifeCycleStatus(
                school.year_lia_started,
            );

            const matchesSchoolType =
                selectedSchoolType === "all" ||
                schoolLifeCycleStatus === selectedSchoolType;

            return matchesSearch && matchesState && matchesRegion && matchesStatus && matchesRpm &&  matchesSchoolLevel && matchesMouStatus && matchesSchoolType;
        });

    return (
        <>
            <div className='mb-6'>
                <div className='mb-3 flex items-center justify-between gap-4'>
                    <div className='flex items-center gap-2 text-sm font-semibold text-zinc-700'>
                        <SlidersHorizontal className='h-4 w-4 text-[#c8102e]' aria-hidden />
                        Filters
                        {hasActiveFilters ? (
                            <span className='rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-[#c8102e]'>
                                Active
                            </span>
                        ) : null}
                    </div>

                    <button
                        type='button'
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className='inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-red-50 hover:text-[#c8102e] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500'
                    >
                        <X className='h-3.5 w-3.5' aria-hidden />
                        Clear all
                    </button>
                </div>

                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    <label className='relative block min-w-0'>
                        <span className='sr-only'>Search schools</span>
                        <Search
                            className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400'
                            aria-hidden
                        />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className={`h-11 w-full min-w-0 rounded-lg border bg-white pl-10 pr-3 text-sm outline-none shadow-sm transition focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 ${
                                search.trim()
                                    ? "border-red-300 bg-red-50 text-[#a70d25]"
                                    : "border-zinc-200 hover:border-zinc-300"
                            }`}
                            placeholder='Search schools...'
                        />
                    </label>

                <FilterSelect
                    label="Filter by state"
                    value={selectedState}
                    onChange={(event) => setSelectedState(event.target.value)}
                >
                    <option value="all">All States</option>
                    {stateOptions.map((state) => (
                        <option key={state} value={state}>
                            {state}
                        </option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Filter by region" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>
                    <option value="all">All Regions</option>
                    {regionOptions.map((region) => (
                        <option key={region} value={region}>
                            {region}
                        </option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Filter by status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} capitalize>
                    <option value="all">All Statuses</option>
                    {statusOptions.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Filter by RPM" value={selectedRpm} onChange={(event) => setSelectedRpm(event.target.value)}>
                    <option value="all">All RPMs</option>
                    {rpmOptions.map((rpm) => (
                        <option key={rpm} value={rpm}>
                            {rpm}
                        </option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Filter by school level" value={selectedSchoolLevel} onChange={(event) => setSelectedSchoolLevel(event.target.value)}>
                    <option value="all">All Levels</option>
                    {schoolLevelOptions.map((level) => (
                        <option key={level.value} value={level.value}>
                            {level.label}
                        </option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Filter by MOU status" value={selectedMouStatus} onChange={(event) => setSelectedMouStatus(event.target.value)} capitalize>
                    <option value="all">All MOU</option>
                    {mouStatusOptions.map((mouStatus) => (
                        <option key={mouStatus} value={mouStatus}>
                            {mouStatus}
                        </option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Filter by school type" value={selectedSchoolType} onChange={(event) => setSelectedSchoolType(event.target.value)}>
                    <option value="all">All Schools</option>
                    <option value="new">New Schools</option>
                    <option value="returning">Returning</option>
                </FilterSelect>
                </div>
            </div>

            <div className='mb-6 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between'>
                <p className='text-sm text-zinc-500'>
                    Showing {filteredSchools.length} of {schools.length} school records
                </p>

                <button 
                    type='button'
                    onClick={exportSchoolsGoogleSheet}
                    disabled={filteredSchools.length === 0 || isExporting}
                    className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
                >
                    <Download className='h-4 w-4' aria-hidden />
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
                            className='font-semibold underline'
                        >
                            Open export
                        </a>
                    </p>
                    
                    <button
                        type='button'
                        onClick={() => {
                            setExportUrl("");
                            setExportError("");
                        }}
                        className='rounded-md px-2 py-1 text-sm font-bold text-green-700 hover:bg-green-100'
                        aria-label='Dismiss export confirmation'
                    >
                        x
                    </button>
                </div>
            ) : null}

            {exportError ? (
                <div className='mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                    {exportError}
                </div>
            ) : null}

            <div className='hidden overflow-x-auto md:block'>
                <table className='w-full min-w-[1460px] border-collapse text-left text-sm'>
                    <thead>
                        <tr className='border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500'>
                            <th className='w-12 px-4 py-3'>#</th>
                            <th className='w-56 px-4 py-3'>School Name</th>
                            <th className='px-4 py-3'>Year Started LIA</th>
                            <th className='px-4 py-3'>Address</th>
                            <th className='w-24 px-4 py-3'>State</th>
                            <th className='w-28 px-4 py-3'>Region</th>
                            <th className='w-32 px-4 py-3 text-center'>Level</th>
                            <th className='w-28 px-4 py-3'>District</th>
                            <th className='w-28 px-4 py-3'>Assigned RPM</th>
                            <th className='w-28 px-4 py-3'>Status</th>
                            <th className='w-28 px-4 py-3'>MOU</th>
                            <th className='w-32 px-4 py-3'>Last Contact</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredSchools.map((school, index) => (
                            <tr
                                key={school.id}
                                className="border-b border-zinc-100 hover:bg-red-50/60"
                            >
                                <td className='px-4 py-5 text-sm font-semibold text-zinc-400'>
                                    {index + 1}
                                </td>
                                <td className='px-4 py-5 font-semibold'>
                                    <Link
                                        href={`/schools/${school.id}`}
                                        className='text-zinc-950 hover:text-[#c8102e]'
                                    >
                                        {school.name}
                                    </Link>
                                </td>
                                <td className='px-4 py-5'>{school.year_lia_started ?? "N/A"}</td>
                                <td className='w-28 break-words px-4 py-5 [overflow-wrap:anywhere]'>
                                    {hasAddress(school.address) ? (
                                        <a
                                            href={getDirectionsHref(school)}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='text-zinc-700 hover:text-[#c8102e] hover:underline'
                                        >
                                            {school.address}
                                        </a>
                                    ) : (
                                        "N/A"
                                    )}
                                </td>
                                <td className='w-24 px-4 py-5'>{school.state}</td>
                                <td className='w-28 px-4 py-5'>{school.region ?? "N/A"}</td>
                                <td className='w-32 px-4 py-5 text-center'>
                                    <span className='inline-flex justify-center whitespace-nowrap rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600'>
                                        {formatSchoolLevel(school.schoolLevel)}
                                    </span>
                                </td>
                                <td className='px-4 py-5'>{school.district}</td>
                                <td className='px-4 py-5'>{school.rpm}</td>
                                <td className='px-4 py-5'>
                                    <span
                                        className={
                                            school.status === "active"
                                                ? "whitespace-nowrap rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700"
                                                : "whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]"
                                        }
                                    >
                                        {school.status}
                                    </span>
                                </td>

                                <td className='px-4 py-5'>
                                    <span
                                        className={
                                            school.mouStatus === "signed"
                                                ? "whitespace-nowrap rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700"
                                                : "whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]"
                                        }
                                    >
                                        {school.mouStatus}
                                    </span>
                                </td>
                                <td className='px-4 py-5'>
                                    {school.lastContactAt ? (
                                        <Link
                                            href={getActivityLogHref(school)}
                                            className='font-semibold text-zinc-700 hover:text-[#c8102e] hover:underline'
                                        >
                                            {formatDate(school.lastContactAt)}
                                        </Link>
                                    ) : (
                                        "N/A"
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className='grid gap-3 md:hidden'>
                {filteredSchools.map((school) => (
                    <article
                        key={school.id}
                        className='rounded-md border border-zinc-200 bg-white p-4 shadow-sm'
                    >
                        <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0'>
                                <Link
                                    href={`/schools/${school.id}`}
                                    className='break-words text-base font-semibold text-zinc-950 hover:text-[#c8102e] [overflow-wrap:anywhere]'
                                >
                                    {school.name}
                                </Link>
                                <p className='mt-1 break-words text-sm text-zinc-500 [overflow-wrap:anywhere]'>
                                    {hasAddress(school.address) ? (
                                        <a
                                            href={getDirectionsHref(school)}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='hover:text-[#c8102e] hover:underline'
                                        >
                                            {school.address}
                                        </a>
                                    ) : (
                                        "No address listed"
                                    )}
                                </p>
                            </div>

                            <span
                                className= {
                                    school.status === "active"
                                        ? "shrink-0 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700"
                                        : "shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]"
                                }
                            >
                                {school.status}
                            </span>
                        </div>

                        <div className='mt-4 grid grid-cols-2 gap-3 text-sm'>
                            <div>
                                <p className='text-xs uppercase text-zinc-500'>State</p>
                                <p className='mt-1 font-semibold'>{school.state}</p>
                            </div>

                            <div>
                                <p className='text-xs uppercase text-zinc-500'>Region</p>
                                <p className='mt-1 font-semibold'>{school.region ?? "N/A"}</p>
                            </div>

                            <div>
                                <p className='text-xs uppercase text-zinc-500'>Level</p>
                                <p className='mt-1 font-semibold'>
                                    {formatSchoolLevel(school.schoolLevel)}
                                </p>
                            </div>

                            <div>
                                <p className='text-xs uppercase text-zinc-500'>Year</p>
                                <p className='mt-1 font-semibold'>
                                    {school.year_lia_started ?? "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-xs uppercase text-zinc-500'>MOU</p>
                                <p className='mt-1'>
                                    <span
                                        className={
                                            school.mouStatus === "signed"
                                                ? "rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700"
                                                : "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]"                                           
                                        }
                                    >
                                        {school.mouStatus}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className='mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm'>
                            <div>
                                <p className='text-xs uppercase text-zinc-500'>District</p>
                                <p className='mt-1 break-words font-semibold [overflow-wrap:anywhere]'>
                                    {school.district}
                                </p>
                            </div>

                            <div>
                                <p className='text-xs uppercase text-zinc-500'>Assigned RPM</p>
                                <p className='mt-1 break-words font-semibold [overflow-wrap:anywhere]'>
                                    {school.rpm}
                                </p>
                            </div>

                            <div>
                                <p className='text-xs uppercase text-zinc-500'>Last Contact</p>
                                <p className='mt-1 font-semibold'>
                                    {school.lastContactAt ? (
                                        <Link
                                            href={getActivityLogHref(school)}
                                            className='text-zinc-950 hover:text-[#c8102e] hover:underline'
                                        >
                                            {formatDate(school.lastContactAt)}
                                        </Link>
                                    ) : (
                                        "N/A"
                                    )}
                                </p>
                            </div>
                        </div>

                        <Link
                            href={`/schools/${school.id}`}
                            className='mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]'
                        >
                            View School
                        </Link>
                    </article>
                ))}
            </div>
            
            {filteredSchools.length === 0 ? (
                <div className='mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500'>
                    No schools match your search.
                </div>
            ) : null}
        </>
    )
}

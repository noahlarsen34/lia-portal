"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { exportSchoolsToGoogleSheet } from './export-actions';

type SchoolRow = {
    id: string;
    name: string;
    year_lia_started: number | null;
    address: string | null;
    state: string;
    region: string | null;
    district: string;
    rpm: string;
    status: string;
    mouStatus: string;
    updatedAt: string;
};

type SchoolsTableProps = {
    schools: SchoolRow[];
};

export function SchoolsTable({ schools }: SchoolsTableProps) {
    const [search, setSearch] = useState("");
    const [selectedState, setSelectedState] = useState("all");
    const [selectedRegion, setSelectedRegion] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedRpm, setSelectedRpm] = useState("all");
    const [selectedMouStatus, setSelectedMouStatus] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");

    const hasAddress = (address: string | null) => {
        return Boolean(address?.trim());
    };

    const getDirectionsHref = (school: SchoolRow) => {
        const destination = [school.name, school.address, school.state]
            .filter(Boolean)
            .join(", ");
        
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    }

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
    
    const mouStatusOptions = ["signed", "pending", "not signed"];

    const clearFilters = () => {
        setSearch("");
        setSelectedState("all");
        setSelectedRegion("all");
        setSelectedStatus("all");
        setSelectedRpm("all");
        setSelectedMouStatus("all");
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
        selectedMouStatus !== "all";

    const filteredSchools = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        return schools.filter((school) => {
            const matchesSearch =
                !searchText ||
                school.name.toLowerCase().includes(searchText) ||
                school.address?.toLowerCase().includes(searchText) ||
                school.state.toLowerCase().includes(searchText) ||
                school.region?.toLowerCase().includes(searchText) ||
                school.district.toLowerCase().includes(searchText) ||
                school.rpm.toLowerCase().includes(searchText) ||
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
            
            const matchesMouStatus = 
                selectedMouStatus === "all" || school.mouStatus === selectedMouStatus;

            return matchesSearch && matchesState && matchesRegion && matchesStatus && matchesRpm && matchesMouStatus;
        })
    }, [schools, search, selectedState, selectedRegion, selectedStatus, selectedRpm, selectedMouStatus]);

    return (
        <>
            <div className='mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(220px,1fr)_130px_140px_140px_150px_130px_80px]'>
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className='h-10 w-full min-w-0 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                    placeholder='Search schools...'
                />

                <select
                    value={selectedState}
                    onChange={(event) => setSelectedState(event.target.value)}
                    className='h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                >
                    <option value="all">All States</option>
                    {stateOptions.map((state) => (
                        <option key={state} value={state}>
                            {state}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedRegion}
                    onChange={(event) => setSelectedRegion(event.target.value)}
                    className='h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                >
                    <option value="all">All Regions</option>
                    {regionOptions.map((region) => (
                        <option key={region} value={region}>
                            {region}
                        </option>
                    ))}
                </select>
                <select 
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    className='h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm capitalize outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                >
                    <option value="all">All Statuses</option>
                    {statusOptions.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
                <select 
                    value={selectedRpm}
                    onChange={(event) => setSelectedRpm(event.target.value)}
                    className='h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                >
                    <option value="all">All RPMs</option>
                    {rpmOptions.map((rpm) => (
                        <option key={rpm} value={rpm}>
                            {rpm}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedMouStatus}
                    onChange={(event) => setSelectedMouStatus(event.target.value)}
                    className='h-10 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm capitalize outline-none hover:bg-red-50 focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                >
                    <option value="all">All MOU</option>
                    {mouStatusOptions.map((mouStatus) => (
                        <option key={mouStatus} value={mouStatus}>
                            {mouStatus}
                        </option>
                    ))}
                </select>
                <button 
                    type='button'
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className='h-10 w-full rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-zinc-700'
                >
                    Clear
                </button>
            </div>

            <div className='mb-6 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between'>
                <p className='text-sm text-zinc-500'>
                    Showing {filteredSchools.length} of {schools.length} school records
                </p>

                <button 
                    type='button'
                    onClick={exportSchoolsGoogleSheet}
                    disabled={filteredSchools.length === 0 || isExporting}
                    className='h-10 w-full rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
                >
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
                <table className='w-full min-w-[1320px] border-collapse text-left text-sm'>
                    <thead>
                        <tr className='border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500'>
                            <th className='w-12 px-4 py-3'>#</th>
                            <th className='w-56 px-4 py-3'>School Name</th>
                            <th className='px-4 py-3'>Year Started LIA</th>
                            <th className='px-4 py-3'>Address</th>
                            <th className='w-24 px-4 py-3'>State</th>
                            <th className='w-28 px-4 py-3'>Region</th>
                            <th className='w-28 px-4 py-3'>District</th>
                            <th className='w-28 px-4 py-3'>Assigned RPM</th>
                            <th className='w-28 px-4 py-3'>Status</th>
                            <th className='w-28 px-4 py-3'>MOU</th>
                            <th className='w-28 px-4 py-3'>Last Updated</th>
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
                                    {new Date(school.updatedAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
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
                                <p className='text-xs uppercase text-zinc-500'>Last Updated</p>
                                <p className='mt-1 font-semibold'>
                                    {new Date(school.updatedAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
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

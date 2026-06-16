"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';

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

    const filteredSchools = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        if (!searchText) {
            return schools;
        }

        return schools.filter((school) => {
            return (
                school.name.toLowerCase().includes(searchText) ||
                school.address?.toLowerCase().includes(searchText) ||
                school.state.toLowerCase().includes(searchText) ||
                school.region?.toLowerCase().includes(searchText) ||
                school.district.toLowerCase().includes(searchText) ||
                school.rpm.toLowerCase().includes(searchText) ||
                school.status.toLowerCase().includes(searchText) ||
                school.mouStatus.toLowerCase().includes(searchText)
            );
        });
    }, [schools, search]);

    return (
        <>
            <div className='mb-6 flex flex-wrap gap-3'>
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className='h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 sm:w-72'
                    placeholder='Search schools...'
                />

                <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                    State
                </button>
                <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                    Region
                </button>
                <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                    Status
                </button>
                <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                    RPM
                </button>
                <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                    MOU Status
                </button>
                <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                    Filter
                </button>

                <Link
                    href='/schools/new'
                    className='w-fit rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a70d25]'
                >
                    Add School
                </Link>
            </div>

            <div className='overflow-x-auto'>
                <table className='w-full min-w-[1180px] border-collapse text-left text-sm'>
                    <thead>
                        <tr className='border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500'>
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
                        {filteredSchools.map((school) => (
                            <tr
                                key={school.id}
                                className="border-b border-zinc-100 hover:bg-red-50/60"
                            >
                                <td className='px-4 py-5 font-semibold'>
                                    <Link
                                        href={`/schools/${school.id}`}
                                        className='text-zinc-950 hover:text-[#c8102e]'
                                    >
                                        {school.name}
                                    </Link>
                                </td>
                                <td className='px-4 py-5'>{school.year_lia_started ?? "N/A"}</td>
                                <td className='w-28 px-4 py-5'>{school.address ?? "N/A"}</td>
                                <td className='w-24 px-4 py-5'>{school.state}</td>
                                <td className='w-28 px-4 py-5'>{school.region ?? "N/A"}</td>
                                <td className='px-4 py-5'>{school.district}</td>
                                <td className='px-4 py-5'>{school.rpm}</td>
                                <td className='px-4 py-5'>
                                    <span className='whitespace-nowrap rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700'>
                                        {school.status}
                                    </span>
                                </td>

                                <td className='px-4 py-5'>
                                    <span className='whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]'>
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

            {filteredSchools.length === 0 ? (
                <div className='mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500'>
                    No schools match your search.
                </div>
            ) : null}
        </>
    )
}

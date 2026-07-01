"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createSchool } from "./actions";

const states = [
    "Arizona",
    "California",
    "Colorado",
    "Connecticut",
    "Florida",
    "Idaho",
    "Illinois",
    "Iowa",
    "Massachusetts",
    "Nevada",
    "New Mexico",
    "New York",
    "Oregon",
    "Tennessee",
    "Texas",
    "Utah",
    "Washington",
];

type District = {
    id: string;
    name: string;
    state: string | null;
};

type Rpm = {
    id:string;
    full_name: string | null;
};

type SchoolFormProps = {
    districts: District[];
    rpms: Rpm[];
    error?: string;
    initialState?: string;
};

export function SchoolForm({
    districts,
    rpms,
    error,
    initialState = "",
}: SchoolFormProps) {
    const [selectedState, setSelectedState] = useState(initialState);

    const filteredDistricts = useMemo(() => {
        if (!selectedState) {
            return [];
        }

        return districts.filter((district) => district.state === selectedState);
    }, [districts, selectedState]);

    const addDistrictHref = selectedState
        ? `/districts/new?state=${encodeURIComponent(selectedState)}`
        : "/districts/new";
    
    return (
        <section className="mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6">
                <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                    Add School
                </p>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                    Create School Profile
                </h1>
                <p className="mt-1 text-sm text-zinc-600">
                    Add a new school to the LIA portal database
                </p>
            </div>

            {error ? (
                <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error === 'missing-fields' 
                        ? "School name, state, school level, status, and MOU status are required."
                        : "Something went wrong. Please try again."
                    }
                </div>
            ) : null}

            <form action={createSchool} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">
                            School Name
                        </span>
                        <input
                            name="name"
                            required
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        />
                    </label>

                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">
                            Year LIA Started
                        </span>
                        <input
                            name="year_lia_started"
                            type="number"
                            min="2001"
                            max="2100"
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        />
                    </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">Address</span>
                        <input
                            name="address"
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        />
                    </label>

                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">State</span>
                        <select
                            name="state"
                            required
                            value={selectedState}
                            onChange={(event) => setSelectedState(event.target.value)}
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="">Select state</option>
                            {states.map((state) => (
                                <option key={state} value={state}>
                                    {state}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">Region</span>
                        <select
                            name="region"
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="">N/A</option>
                            <option value="North">North</option>
                            <option value="South">South</option>
                            <option value="Central">Central</option>
                            <option value="East">East</option>
                            <option value="West">West</option>
                        </select>
                    </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">
                            District
                        </span>
                        <select
                            name="district_id"
                            disabled={!selectedState}
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="">
                                {selectedState ? "No district selected" : "Select state first"}
                            </option>
                            {filteredDistricts.map((district) => (
                                <option key={district.id} value={district.id}>
                                    {district.name}
                                </option>
                            ))}
                        </select>

                        <Link
                            href={addDistrictHref}
                            className="mt-2 inline-flex text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                        >
                            District not listed? Add district
                        </Link>
                    </label>

                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">
                            Assigned RPM
                        </span>
                        <select
                            name="assigned_rpm_id"
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="">Unassigned</option>
                            {rpms.map((rpm) => (
                                <option key={rpm.id} value={rpm.id}>
                                    {rpm.full_name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">School Level</span>
                        <select
                            name="school_level"
                            required
                            defaultValue=""
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="">Select level</option>
                            <option value="elementary">Elementary</option>
                            <option value="middle">Middle School</option>
                            <option value="high">High School</option>
                            <option value="unknown">Unknown</option>
                        </select>
                    </label>

                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">Status</span>
                        <select
                            name="status"
                            required
                            defaultValue="active"
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="interested">Interested</option>
                            <option value="pending">Pending</option>
                        </select>
                    </label>

                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">
                            MOU Status
                        </span>
                        <select
                            name="mou_status"
                            required
                            defaultValue="pending"
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="signed">Signed</option>
                            <option value="pending">Pending</option>
                            <option value="not signed">Not Signed</option>
                        </select>
                    </label>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                    <Link
                        href="/schools"
                        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto"
                    >
                        Cancel
                    </Link>

                    <button
                        type="submit"
                        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                    >
                        Create School
                    </button>
                </div>
            </form>
        </section>
    );
}

"use client";

import { ChevronDown, School } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
    LiaisonDistrict,
    LiaisonSchoolGroup,
} from "@/utils/district-liaison-data";
import { formatSchoolYear, normalizeSchoolYear } from "@/utils/school-year";

type DistrictClassesWorkspaceProps = {
    districts: LiaisonDistrict[];
    schools: LiaisonSchoolGroup[];
};

export function DistrictClassesWorkspace({
    districts,
    schools,
}: DistrictClassesWorkspaceProps) {
    const [search, setSearch] = useState("");
    const [districtId, setDistrictId] = useState("all");
    const [schoolId, setSchoolId] = useState("all");
    const [schoolYear, setSchoolYear] = useState("all");
    const [status, setStatus] = useState("active");

    const schoolOptions = useMemo(
        () =>
            schools.filter(
                (school) =>
                    districtId === "all" || school.districtId === districtId,
            ),
        [districtId, schools],
    );
    const schoolYears = useMemo(
        () =>
            Array.from(
                new Set(
                    schools.flatMap((school) =>
                        school.classes.map((liaClass) =>
                            normalizeSchoolYear(liaClass.schoolYear),
                        ),
                    ),
                ),
            ).sort((a, b) => b.localeCompare(a)),
        [schools],
    );
    const visibleSchools = useMemo(() => {
        const query = search.trim().toLowerCase();

        return schools
            .filter(
                (school) =>
                    (districtId === "all" || school.districtId === districtId) &&
                    (schoolId === "all" || school.id === schoolId),
            )
            .map((school) => {
                const schoolMatches =
                    !query ||
                    school.name.toLowerCase().includes(query) ||
                    school.districtName.toLowerCase().includes(query);
                const classes = school.classes.filter((liaClass) => {
                    const matchesQuery =
                        schoolMatches ||
                        liaClass.name.toLowerCase().includes(query) ||
                        liaClass.teacherName.toLowerCase().includes(query) ||
                        liaClass.period?.toLowerCase().includes(query) ||
                        liaClass.gradeLevel?.toLowerCase().includes(query);
                    const matchesYear =
                        schoolYear === "all" ||
                        normalizeSchoolYear(liaClass.schoolYear) === schoolYear;
                    const matchesStatus =
                        status === "all" || liaClass.status === status;
                    return matchesQuery && matchesYear && matchesStatus;
                });

                return { ...school, classes };
            })
            .filter((school) => {
                const schoolMatches =
                    !query ||
                    school.name.toLowerCase().includes(query) ||
                    school.districtName.toLowerCase().includes(query);
                return school.classes.length > 0 || schoolMatches;
            });
    }, [districtId, schoolId, schoolYear, schools, search, status]);

    const visibleClassCount = visibleSchools.reduce(
        (total, school) => total + school.classes.length,
        0,
    );

    function changeDistrict(value: string) {
        setDistrictId(value);
        if (
            schoolId !== "all" &&
            !schools.some(
                (school) =>
                    school.id === schoolId &&
                    (value === "all" || school.districtId === value),
            )
        ) {
            setSchoolId("all");
        }
    }

    return (
        <>
            <section className="rounded-md border border-red-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,2fr)_repeat(4,minmax(9rem,1fr))]">
                    <label>
                        <span className="sr-only">Search classes</span>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search school, class, or teacher..."
                            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                        />
                    </label>
                    <select
                        aria-label="Filter by district"
                        value={districtId}
                        onChange={(event) => changeDistrict(event.target.value)}
                        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    >
                        <option value="all">All districts</option>
                        {districts.map((district) => (
                            <option key={district.id} value={district.id}>{district.name}</option>
                        ))}
                    </select>
                    <select
                        aria-label="Filter by school"
                        value={schoolId}
                        onChange={(event) => setSchoolId(event.target.value)}
                        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    >
                        <option value="all">All schools</option>
                        {schoolOptions.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>
                    <select
                        aria-label="Filter by school year"
                        value={schoolYear}
                        onChange={(event) => setSchoolYear(event.target.value)}
                        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    >
                        <option value="all">All school years</option>
                        {schoolYears.map((year) => (
                            <option key={year} value={year}>
                                {formatSchoolYear(year)}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Filter by class status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    >
                        <option value="active">Active classes</option>
                        <option value="inactive">Inactive classes</option>
                        <option value="all">All statuses</option>
                    </select>
                </div>
                <div className="mt-3 flex justify-end border-t border-zinc-100 pt-3">
                    <p className="text-sm text-zinc-500">
                        {visibleSchools.length} school{visibleSchools.length === 1 ? "" : "s"} · {visibleClassCount} class{visibleClassCount === 1 ? "" : "es"}
                    </p>
                </div>
            </section>

            <div className="mt-5 space-y-4">
                {visibleSchools.map((school) => (
                    <details key={school.id} open className="group overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-red-50/50">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#c4122f]">
                                    <School className="h-5 w-5" aria-hidden />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate font-semibold text-zinc-950">{school.name}</h2>
                                    <p className="text-sm text-zinc-500">{school.districtName}{school.state ? ` · ${school.state}` : ""}</p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <span className="text-sm font-medium text-zinc-600">{school.classes.length} class{school.classes.length === 1 ? "" : "es"}</span>
                                <ChevronDown className="h-5 w-5 text-zinc-500 transition group-open:rotate-180" aria-hidden />
                            </div>
                        </summary>
                        <div className="border-t border-zinc-100">
                            {school.classes.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[900px] text-left text-sm">
                                        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                                            <tr>
                                                <th className="px-5 py-3 font-semibold">Class</th>
                                                <th className="px-4 py-3 font-semibold">Teacher</th>
                                                <th className="px-4 py-3 font-semibold">Year</th>
                                                <th className="px-4 py-3 font-semibold">Period</th>
                                                <th className="px-4 py-3 font-semibold">Grade</th>
                                                <th className="px-4 py-3 font-semibold">Students</th>
                                                <th className="px-4 py-3 font-semibold">Status</th>
                                                <th className="px-4 py-3 text-right font-semibold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {school.classes.map((liaClass) => (
                                                <tr key={liaClass.id}>
                                                    <td className="px-5 py-4 font-semibold text-zinc-950">{liaClass.name}</td>
                                                    <td className="px-4 py-4 text-zinc-700">{liaClass.teacherName}</td>
                                                    <td className="px-4 py-4 text-zinc-700">{formatSchoolYear(liaClass.schoolYear)}</td>
                                                    <td className="px-4 py-4 text-zinc-700">{liaClass.period || "N/A"}</td>
                                                    <td className="px-4 py-4 text-zinc-700">{liaClass.gradeLevel || "N/A"}</td>
                                                    <td className="px-4 py-4 text-zinc-700">{liaClass.enrollmentCount}</td>
                                                    <td className="px-4 py-4">
                                                        <span className={liaClass.status === "active" ? "rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700" : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600"}>{liaClass.status}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <Link
                                                            href={`/teacher/classes/${liaClass.id}`}
                                                            prefetch={false}
                                                            className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-[#c4122f] hover:bg-red-50"
                                                        >
                                                            View
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="px-5 py-6 text-sm text-zinc-500">No classes match the selected filters for this school.</p>
                            )}
                        </div>
                    </details>
                ))}
            </div>

            {visibleSchools.length === 0 ? (
                <section className="mt-5 rounded-md border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
                    <h2 className="font-semibold text-zinc-950">No matching schools or classes</h2>
                    <p className="mt-2 text-sm text-zinc-600">Try clearing the search or selecting different filters.</p>
                </section>
            ) : null}
        </>
    );
}

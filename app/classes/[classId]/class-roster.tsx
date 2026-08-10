"use client";

import { useMemo, useState } from "react";

export type RosterStudent = {
    enrollmentId: string;
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    gradeLevel: string;
    committee: string;
    leadershipRole: string;
    tier: string;
    status: string;
    enrolledAt: string;
};

type ClassRosterProps = {
    students: RosterStudent[];
};

function normalize(value: string) {
    return value.trim().toLowerCase();
}

function formatEnrollmentDate(value: string) {
    if (!value) {
        return "N/A";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Denver",
    }).format(new Date(value));
}

export function ClassRoster({ students }: ClassRosterProps) {
    const [search, setSearch] = useState("");
    const [grade, setGrade] = useState("all");
    const [committee, setCommittee] = useState("all");

    const gradeOptions = useMemo(
        () =>
                Array.from(
                    new Set(
                        students
                            .map((student) => student.gradeLevel)
                            .filter((value) => value && value !== "N/A"),
                    ),
                ).sort(),
            [students],
    );

    const committeeOptions = useMemo(
        () => 
            Array.from(
                new Set(
                    students
                        .map((student) => student.committee)
                        .filter((value) => value && value !== "N/A"),
                ),
            ).sort(),
        [students],
    );

    const filteredStudents = useMemo(() => {
        const normalizedSearch = normalize(search);

        return students.filter((student) => {
            const fullName =
                `${student.firstName} ${student.lastName}`.trim();

            const matchesSearch =
                !normalizedSearch ||
                normalize(fullName).includes(normalizedSearch) ||
                normalize(student.email).includes(normalizedSearch);
            
            const matchesGrade =
                grade === "all" || student.gradeLevel === grade;
            
            const matchesCommittee =
                committee === "all" ||
                student.committee === committee;
            
            return matchesSearch && matchesGrade && matchesCommittee;
        });
    }, [students, search, grade, committee]);

    function clearFilters() {
        setSearch("")
        setGrade("all");
        setCommittee("all");
    }

    const filtersAreActive =
        search.trim() !== "" ||
        grade !== "all" ||
        committee !== "all";
    
    return (
        <section className="mt-6 overlfow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-5">
                <div>
                    <h2 className="text-xl font-semibold text-zinc-950">
                        Student Roster
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                        Search and review the students currently enrolled in
                        this class.
                    </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-700">
                            Search students
                        </span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Student name or email..."
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-700">
                            Grade level
                        </span>
                        <select
                            value={grade}
                            onChange={(event) =>
                                setGrade(event.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="all">All grade levels</option>

                            {gradeOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-700">
                            Committee
                        </span>
                        <select
                            value={committee}
                            onChange={(event) =>
                                setCommittee(event.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="all">All committees</option>

                            {committeeOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={clearFilters}
                            disabled={!filtersAreActive}
                            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-b border-zinc-200 px-5 py-4">
                <p className="text-sm text-zinc-600">
                    Showing{" "}
                    <span className="font-semibold text-zinc-900">
                        {filteredStudents.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-zinc-900">
                        {students.length}
                    </span>{" "}
                    students
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                            <th className="px-5 py-3">Student</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Grade</th>
                            <th className="px-5 py-3">Committee</th>
                            <th className="px-5 py-3">Leadership</th>
                            <th className="px-5 py-3">Tier</th>
                            <th className="px-5 py-3">Enrolled</th>
                            <th className="px-5 py-3">Status</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-200">
                        {filteredStudents.map((student) => (
                            <tr
                                key={student.enrollmentId}
                                className="hover:bg-zinc-50"
                            >
                                <td className="px-5 py-4">
                                    <p className="font-semibold text-zinc-900">
                                        {student.firstName}{" "}
                                        {student.lastName}
                                    </p>
                                </td>

                                <td className="px-5 py-4 text-zinc-600">
                                    {student.email}
                                </td>

                                <td className="px-5 py-4">
                                    {student.gradeLevel}
                                </td>

                                <td className="px-5 py-4">
                                    {student.committee}
                                </td>

                                <td className="px-5 py-4">
                                    {student.leadershipRole}
                                </td>

                                <td className="px-5 py-4">
                                    {student.tier}
                                </td>

                                <td className="px-5 py-4 text-zinc-600">
                                    {formatEnrollmentDate(
                                        student.enrolledAt,
                                    )}
                                </td>

                                <td className="px-5 py-5">
                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                        {student.status}
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-5 py-10 text-center text-zinc-500"
                                >
                                    {students.length === 0
                                        ? "This class does not have any students yet."
                                        : "No students match these filters."}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { ClassSearchInput } from "./class-search-input";

type StaffClassesPageProps = {
    searchParams: Promise<{
        search?: string;
        status?: string;
    }>;
};

export default async function StaffClassesPage({
    searchParams,
}: StaffClassesPageProps) {
    const { search, status } = await searchParams;
    const { supabase, profile } = await requireStaff();

    const isAdmin = profile.role === "admin";
    const normalizedSearch = search?.trim() ?? "";
    const selectedStatus =
        status === "inactive" || status === "all"
            ? status
            : "active";

    const { data: assignedSchools, error: assignedSchoolsError } =
        isAdmin
            ? { data: null, error: null }
            : await supabase
                  .from("schools")
                  .select("id")
                  .eq("assigned_rpm_id", profile.id);

    if (assignedSchoolsError) {
        throw new Error(
            `Unable to load assigned schools: ${assignedSchoolsError.message}`,
        );
    }

    const assignedSchoolIds = (assignedSchools ?? []).map(
        (school) => school.id,
    );

    let classRows: Array<{
        id: string;
        name: string;
        school_id: string;
        teacher_profile_id: string;
        school_year: string;
        period: string | null;
        grade_level: string | null;
        status: string;
        updated_at: string;
    }> = [];

    if (isAdmin || assignedSchoolIds.length > 0) {
        let classesQuery = supabase
            .from("lia_classes")
            .select(
                `
                    id,
                    name,
                    school_id,
                    teacher_profile_id,
                    school_year,
                    period,
                    grade_level,
                    status,
                    updated_at
                `,
            )
            .order("status")
            .order("name");

        if (!isAdmin) {
            classesQuery = classesQuery.in(
                "school_id",
                assignedSchoolIds,
            );
        }

        if (selectedStatus !== "all") {
            classesQuery = classesQuery.eq("status", selectedStatus);
        }

        if (normalizedSearch) {
            classesQuery = classesQuery.ilike(
                "name",
                `%${normalizedSearch}%`,
            );
        }

        const { data, error } = await classesQuery;

        if (error) {
            throw new Error(
                `Unable to load staff classes: ${error.message}`,
            );
        }

        classRows = data ?? [];
    }

    const schoolIds = Array.from(
        new Set(classRows.map((liaClass) => liaClass.school_id)),
    );
    const teacherProfileIds = Array.from(
        new Set(
            classRows.map((liaClass) => liaClass.teacher_profile_id),
        ),
    );
    const classIds = classRows.map((liaClass) => liaClass.id);

    const [schoolResult, teacherResult, enrollmentResult] =
        await Promise.all([
            schoolIds.length > 0
                ? supabase
                      .from("schools")
                      .select("id, name, state")
                      .in("id", schoolIds)
                : Promise.resolve({ data: [], error: null }),
            teacherProfileIds.length > 0
                ? supabase
                      .from("profiles")
                      .select("id, full_name, email")
                      .in("id", teacherProfileIds)
                : Promise.resolve({ data: [], error: null }),
            classIds.length > 0
                ? supabase
                      .from("lia_class_students")
                      .select("lia_class_id, student_id, status")
                      .in("lia_class_id", classIds)
                      .or("status.is.null,status.neq.removed")
                : Promise.resolve({ data: [], error: null }),
        ]);

    if (schoolResult.error || teacherResult.error || enrollmentResult.error) {
        console.error("Could not load class database relationships", {
            schools: schoolResult.error?.message,
            teachers: teacherResult.error?.message,
            enrollments: enrollmentResult.error?.message,
        });
    }

    const schoolsById = new Map(
        (schoolResult.data ?? []).map((school) => [school.id, school]),
    );
    const teachersById = new Map(
        (teacherResult.data ?? []).map((teacher) => [teacher.id, teacher]),
    );
    const studentCountsByClass = new Map<string, number>();

    for (const enrollment of enrollmentResult.data ?? []) {
        studentCountsByClass.set(
            enrollment.lia_class_id,
            (studentCountsByClass.get(enrollment.lia_class_id) ?? 0) + 1,
        );
    }

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <Link
                        href="/dashboard"
                        className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to dashboard
                    </Link>

                    <header className="mt-5">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                            Staff Database
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold">
                            Classes
                        </h1>
                        <p className="mt-2 text-sm text-zinc-600">
                            {isAdmin
                                ? "View all LIA classes and their current enrollment."
                                : "View classes at schools assigned to you."}
                        </p>
                    </header>

                    <form
                        method="get"
                        className="mt-6 grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px_220px_auto]"
                    >
                        <ClassSearchInput
                            key={`${normalizedSearch}-${selectedStatus}`}
                            initialSearch={normalizedSearch}
                            selectedStatus={selectedStatus}
                        />

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-700">
                                Status
                            </span>
                            <select
                                name="status"
                                defaultValue={selectedStatus}
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                            >
                                <option value="active">Active classes</option>
                                <option value="inactive">
                                    Inactive classes
                                </option>
                                <option value="all">All statuses</option>
                            </select>
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-700">
                                School year
                            </span>
                            <select
                                value="2026-2027"
                                disabled
                                aria-label="School year"
                                className="mt-2 h-11 w-full cursor-not-allowed rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-700"
                            >
                                <option value="2026-2027">2026-2027</option>
                            </select>
                        </label>

                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                className="inline-flex h-11 items-center justify-center rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                            >
                                Filter
                            </button>
                            <Link
                                href="/classes"
                                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Clear
                            </Link>
                        </div>
                    </form>

                    <section className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                        <div className="border-b border-zinc-200 px-5 py-4">
                            <p className="text-sm text-zinc-600">
                                Showing{" "}
                                <span className="font-semibold text-zinc-900">
                                    {classRows.length}
                                </span>{" "}
                                classes
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[950px] text-left text-sm">
                                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                                    <tr>
                                        <th className="px-5 py-3">Class</th>
                                        <th className="px-5 py-3">School</th>
                                        <th className="px-5 py-3">Teacher</th>
                                        <th className="px-5 py-3">Period</th>
                                        <th className="px-5 py-3">
                                            School Year
                                        </th>
                                        <th className="px-5 py-3">
                                            Grade Level
                                        </th>
                                        <th className="px-5 py-3 text-center">
                                            Students
                                        </th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3 text-right">Roster</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-zinc-200">
                                    {classRows.map((liaClass) => {
                                        const school = schoolsById.get(
                                            liaClass.school_id,
                                        );
                                        const teacher = teachersById.get(
                                            liaClass.teacher_profile_id,
                                        );

                                        return (
                                            <tr key={liaClass.id}>
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={`/classes/${liaClass.id}`}
                                                        className="font-semibold text-zinc-900 hover:text-[#c8102e] hover:underline"
                                                    >
                                                        {liaClass.name}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="font-medium">
                                                        {school?.name ??
                                                            "Unknown school"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-zinc-500">
                                                        {school?.state ??
                                                            "Unknown state"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p>
                                                        {teacher?.full_name ??
                                                            "Unknown teacher"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-zinc-500">
                                                        {teacher?.email ?? ""}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {liaClass.period || "N/A"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    2026-2027
                                                </td>
                                                <td className="px-5 py-4">
                                                    {liaClass.grade_level ||
                                                        "N/A"}
                                                </td>
                                                <td className="px-5 py-4 text-center font-semibold">
                                                    {studentCountsByClass.get(
                                                        liaClass.id,
                                                    ) ?? 0}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={
                                                            liaClass.status ===
                                                            "active"
                                                                ? "rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                                                                : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600"
                                                        }
                                                    >
                                                        {liaClass.status ===
                                                        "active"
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        href={`/classes/${liaClass.id}`}
                                                        className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-[#c8102e] bg-white px-3 text-xs font-semibold text-[#c8102e] hover:bg-red-50"
                                                    >
                                                        View roster
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {classRows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-5 py-10 text-center text-zinc-500"
                                            >
                                                No classes match these filters.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}

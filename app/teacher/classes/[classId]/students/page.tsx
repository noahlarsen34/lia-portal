import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { addStudentToClass, removeStudentFromClass } from "./actions";

type StudentsPageProps = {
    params: Promise<{
        classId: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

function formatRosterValue(value: string | null | undefined) {
    return value
        ? value
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "N/A";
}

function formatRosterRole(
    role: string | null | undefined,
    committee: string | null | undefined,
) {
    if (role === "president") {
        return "Class President";
    }

    if (role === "secretary") {
        return "Class Secretary";
    }

    if (role === "historian") {
        return "Class Historian";
    }

    if (role === "vice_president") {
        return committee
            ? `${formatRosterValue(committee)} VP`
            : "Committee VP";
    }

    return "Member";
}

export default async function StudentsPage({
    params,
    searchParams,
}: StudentsPageProps) {
    const { classId } = await params;
    const { error } = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();

    if (!liaClass) {
        notFound();
    }

    const { data: enrollments } = await supabase
        .from("lia_class_students")
        .select(
            `
                id,
                status,
                committee,
                officer_role,
                enrolled_at,
                students (
                    id,
                    first_name,
                    last_name,
                    email,
                    grade_level
                )
            `,
        )
        .eq("lia_class_id", liaClass.id)
        .neq("status", "removed")
        .order("enrolled_at", { ascending: false });

    const addStudent = addStudentToClass.bind(null, liaClass.id);

    return (
        <div className="mx-auto max-w-5xl">
            <Link
                href={`/teacher/classes/${liaClass.id}`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to class
            </Link>

            <section className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                        Students
                    </p>
                    <h1 className="mt-2 break-words text-3xl font-semibold [overflow-wrap:anywhere]">
                        {liaClass.name}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        Add reusable student records and enroll them in this class.
                    </p>
                </div>

                {error ? (
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error === "missing-fields"
                            ? "First name and last name are required."
                            : error === "create-failed"
                                ? "Could not create the student record. Please try again."
                                    : error === "enroll-failed"
                                        ? "Could not enroll that student. They may already be in this class."
                                        : error === "vp-needs-committee"
                                            ? "Vice presidents must be assigned to a committee."
                                            : error === "role-conflict"
                                                ? "That officer role is already assigned in this class."
                                                : error === "already-enrolled"
                                                    ? "That student is already enrolled in this class."
                                                    : error === "remove-failed"
                                                        ? "Could not remove that student. Please try again."
                                                        : error === "not-found"
                                                            ? "That student enrollment could not be found."
                                                            : "Something went wrong. Please try again."}
                    </div>
                ) : null}

                <form
                    action={addStudent}
                    className="mt-6 space-y-5 border-t border-zinc-100 pt-6"
                >
                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block min-w-0">
                            <span className="text-sm font-medium text-zinc-800">
                                First Name
                            </span>
                            <input
                                name="first_name"
                                required
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            />
                        </label>

                        <label className="block min-w-0">
                            <span className="text-sm font-medium text-zinc-800">
                                Last Name
                            </span>
                            <input
                                name="last_name"
                                required
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            />
                        </label>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block min-w-0">
                            <span className="text-sm font-medium text-zinc-800">
                                Email
                            </span>
                            <input
                                name="email"
                                type="email"
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            />
                        </label>

                        <label className="block min-w-0">
                            <span className="text-sm font-medium text-zinc-800">
                                Grade Level
                            </span>
                            <input
                                name="grade_level"
                                placeholder="9-12"
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            />
                        </label>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block min-w-0">
                            <span className="text-sm font-medium text-zinc-800">
                                Committee Assignment
                            </span>
                            <select
                                name="committee"
                                defaultValue=""
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            >
                                <option value="">No committee</option>
                                <option value="professional">Professional</option>
                                <option value="service">Service</option>
                                <option value="social">Social</option>
                            </select>
                        </label>

                        <label className="block min-w-0">
                            <span className="text-sm font-medium text-zinc-800">
                                Class Leadership Role
                            </span>
                            <select
                                name="officer_role"
                                defaultValue="member"
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            >
                                <option value="member">Member</option>
                                <option value="president">Class President</option>
                                <option value="vice_president">Vice President of Selected Committee</option>
                                <option value="secretary">Class Secretary</option>
                                <option value="historian">Class Historian</option>
                            </select>
                        </label>
                    </div>

                    <label className="block min-w-0">
                        <span className="text-sm font-medium text-zinc-800">
                            Notes
                        </span>
                        <textarea
                            name="notes"
                            rows={3}
                            placeholder="Optional notes about this student"
                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                        />
                    </label>

                    <div className="flex justify-end border-t border-zinc-100 pt-5">
                        <button
                            type="submit"
                            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                        >
                            Add Student
                        </button>
                    </div>
                </form>
            </section>

            <section className="mt-5 overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
                    <h2 className="text-xl font-semibold">Class Roster</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                        Students currently enrolled in this class.
                    </p>
                </div>

                {enrollments && enrollments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Student</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Grade</th>
                                    <th className="px-4 py-3">Committee</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {enrollments.map((enrollment) => {
                                    const student = Array.isArray(enrollment.students)
                                        ? enrollment.students[0]
                                        : enrollment.students;
                                    const removeStudent = removeStudentFromClass.bind(
                                        null,
                                        liaClass.id,
                                        enrollment.id,
                                    );

                                    return (
                                        <tr key={enrollment.id}>
                                            <td className="px-4 py-4 font-semibold">
                                                <Link
                                                    href={`/teacher/classes/${liaClass.id}/students/${enrollment.id}`}
                                                    className="text-zinc-950 transition hover:text-[#c4122f]"
                                                >
                                                    {student
                                                        ? `${student.first_name} ${student.last_name}`
                                                        : "Unknown student"}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-4 text-zinc-700">
                                                {student?.email || "N/A"}
                                            </td>
                                            <td className="px-4 py-4 text-zinc-700">
                                                {student?.grade_level || "N/A"}
                                            </td>
                                            <td className="px-4 py-4 text-zinc-700 capitalize">
                                                {formatRosterValue(enrollment.committee)}
                                            </td>
                                            <td className="px-4 py-4 text-zinc-700">
                                                {formatRosterRole(
                                                    enrollment.officer_role,
                                                    enrollment.committee,
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-zinc-700 capitalize">
                                                {enrollment.status}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <Link
                                                    href={`/teacher/classes/${liaClass.id}/students/${enrollment.id}`}
                                                    className="font-semibold text-[#c4122f] hover:text-[#a70d25]"
                                                >
                                                    View
                                                </Link>
                                                <Link
                                                    href={`/teacher/classes/${liaClass.id}/students/${enrollment.id}/edit`}
                                                    className="ml-4 font-semibold text-[#c4122f] hover:text-[#a70d25]"
                                                >
                                                    Edit
                                                </Link>
                                                <form action={removeStudent} className="inline">
                                                    <button
                                                        type="submit"
                                                        className="ml-4 font-semibold text-zinc-500 hover:text-[#c4122f]"
                                                    >
                                                        Remove from Class
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-5 py-10 text-center text-sm text-zinc-500 sm:px-6">
                        No students added yet.
                    </div>
                )}
            </section>
        </div>
    );
}

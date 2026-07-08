import Link from "next/link";
import {
    BookOpen,
    ClipboardList,
    FileText,
    Users,
} from 'lucide-react';
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { deleteLiaClass } from "./actions";

type TeacherClassPageProps = {
    params: Promise<{
        classId: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

function formatRosterValue(value: string | null | undefined) {
    return value ? value.replace("_", " ") : "N/A";
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

export default async function TeacherClassPage({
    params,
    searchParams,
}: TeacherClassPageProps) {
    const { classId } = await params;
    const { error } = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select(
            `
                id,
                name,
                school_year,
                period,
                grade_level,
                status,
                notes,
                teacher_profile_id,
                school_id,
                schools (
                    id,
                    name
                )   
            `,
        )
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass) {
        notFound();
    }

    const school = Array.isArray(liaClass.schools)
        ? liaClass.schools[0]
        : liaClass.schools;

    const { count: studentCount } = await supabase
        .from("lia_class_students")
        .select("id", { count: "exact", head: true })
        .eq("lia_class_id", liaClass.id)
        .neq("status", "removed");

    const { data: studentEnrollments } = await supabase
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

    const hasStudents = (studentCount ?? 0) > 0;
    const deleteClassById = deleteLiaClass.bind(null, liaClass.id);
    
    const details = [
        { label: "School", value: school?.name ?? "N/A" },
        { label: "School Year", value: liaClass.school_year },
        { label: "Period", value: liaClass.period || "N/A" },
        { label: "Grade", value: liaClass.grade_level || "N/A" },
        { label: "Status", value: liaClass.status },
    ];

    const sections = [
        {
            title: "Students",
            description: "Add and manage students enrolled in this LIA class.",
            href: `/teacher/classes/${liaClass.id}/students`,
            icon: Users,
            count: String(studentCount ?? 0),
        },
        {
            title: "Modules",
            description: "Assign teacher-created or LIA program modules.",
            href: `/teacher/classes/${liaClass.id}/modules`,
            icon: BookOpen,
            count: "0",
        },
        {
            title: "Assignments",
            description: "Create submissions, activities, and class tasks",
            href: `/teacher/classes/${liaClass.id}/assignments`,
            icon: ClipboardList,
            count: "0",
        },
        {
            title: "Resources",
            description: "Share links, files, and class-specific materials.",
            href: `/teacher/classes/${liaClass.id}/resources`,
            icon: FileText,
            count: "0",
        },
    ];

    return (
        <div className="mx-auto max-w-7xl">
            <Link
                href="/teacher/classes"
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to classes
            </Link>

            <header className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                {error ? (
                    <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error === "class-has-students"
                            ? "This class has students, so it cannot be deleted. You can edit the class or mark it inactive instead."
                            : error === "student-check-failed"
                                ? "Could not check whether this class has students. Please try again."
                                : error === "delete-failed"
                                    ? "Could not delete this class. Please try again."
                                    : "Something went wrong. Please try again."
                        }
                    </div>
                ) : null}

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                            Class
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 className="break-words text-3xl font-semibold [overflow-wrap:anywhere]">
                                {liaClass.name}
                            </h1>
                            <span
                                className={
                                    liaClass.status === "active"
                                        ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700"
                                        : "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold capitalize text-[#c4122f]"
                                }
                            >
                                {liaClass.status}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-600">
                            Manage class roster, assignments, modules, and resources.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            href={`/teacher/classes/${liaClass.id}/edit`}
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white transition hover:bg-[#a70d25]"
                        >
                            Edit Class
                        </Link>

                        {hasStudents ? (
                            <button
                                type="button"
                                disabled
                                title="Classes with students cannot be deleted."
                                className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-400"
                            >
                                Delete Class
                            </button>
                        ) : (
                            <form action={deleteClassById}>
                                <button
                                    type="submit"
                                    className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-[#c4122f] transition hover:bg-red-50"
                                >
                                    Delete Class
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2 lg:grid-cols-5">
                    {details.map((detail) => (
                        <div key={detail.label}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                {detail.label}
                            </p>
                            <p className="mt-1 break-words font-semibold text-zinc-950 [overflow-wrap:anywhere]">
                                {detail.value}
                            </p>
                        </div>
                    ))}
                </div>

                {liaClass.notes ? (
                    <div className="mt-6 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Notes
                        </p>
                        <p className="mt-2 break-words text-sm leading-6 text-zinc-700 [overflow-wrap:anywhere]">
                            {liaClass.notes}
                        </p>
                    </div>
                ) : null}
            </header>

            <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {sections.map((section) => {
                    const Icon = section.icon;

                    return (
                        <Link
                            key={section.title}
                            href={section.href}
                            className="rounded-md border border-red-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-[#c4122f]">
                                    <Icon className="h-6 w-6" aria-hidden />
                                </div>

                                <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                                    {section.count}
                                </span>
                            </div>

                            <h2 className="mt-4 text-lg font-semibold text-zinc-950">
                                {section.title}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-zinc-600">
                                {section.description}
                            </p>
                        </Link>
                    );
                })}
            </section>

            <section className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">Student Roster</h2>
                        <p className="mt-1 text-sm text-zinc-600">
                            Add and manage students enrolled in this LIA class.
                        </p>
                    </div>

                    <Link
                        href={`/teacher/classes/${liaClass.id}/students`}
                        className='inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-red-50 hover:text-[#c4122f]'
                    >
                        Manage Students
                    </Link>
                </div>

                {studentEnrollments && studentEnrollments.length > 0 ? (
                    <div className="mt-5 overflow-hidden rounded-md border border-zinc-200">
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 bg-white">
                                    {studentEnrollments.map((enrollment) => {
                                        const student = Array.isArray(enrollment.students)
                                            ? enrollment.students[0]
                                            : enrollment.students;

                                        return (
                                            <tr key={enrollment.id}>
                                                <td className="px-4 py-4 font-semibold text-zinc-950">
                                                    {student
                                                        ? `${student.first_name} ${student.last_name}`
                                                        : "Unknown student"}
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
                                                <td className="px-4 py-4">
                                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700">
                                                        {enrollment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="mt-5 rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
                        No students added yet.
                    </div>
                )}
            </section>
        </div>
    );
}

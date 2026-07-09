import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";

type StudentProfilePageProps = {
    params: Promise<{
        classId: string;
        enrollmentId: string;
    }>;
};

function formatValue(value: string | null | undefined) {
    return value
        ? value
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "N/A";
}

function formatRole(
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
        return committee ? `${formatValue(committee)} VP` : "Committee VP";
    }

    return "Member";
}

function formatDate(value: string | null | undefined) {
    if (!value) {
        return "N/A";
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
    }).format(new Date(value));
}

export default async function StudentProfilePage({
    params,
}: StudentProfilePageProps) {
    const { classId, enrollmentId } = await params;
    const { supabase, profile } = await requireTeacher();

    const { data: enrollment } = await supabase
        .from("lia_class_students")
        .select(
            `
                id,
                status,
                committee,
                officer_role,
                enrolled_at,
                removed_at,
                students (
                    id,
                    first_name,
                    last_name,
                    email,
                    grade_level,
                    status,
                    notes
                ),
                lia_classes (
                    id,
                    name,
                    school_year,
                    period,
                    grade_level,
                    teacher_profile_id,
                    schools (
                        id,
                        name
                    )
                )
            `,
        )
        .eq("id", enrollmentId)
        .eq("lia_class_id", classId)
        .maybeSingle();

    const student = Array.isArray(enrollment?.students)
        ? enrollment?.students[0]
        : enrollment?.students;

    const liaClass = Array.isArray(enrollment?.lia_classes)
        ? enrollment?.lia_classes[0]
        : enrollment?.lia_classes;

    const school = Array.isArray(liaClass?.schools)
        ? liaClass?.schools[0]
        : liaClass?.schools;

    if (
        !enrollment ||
        !student ||
        !liaClass ||
        liaClass.teacher_profile_id !== profile.id
    ) {
        notFound();
    }

    const studentName = `${student.first_name} ${student.last_name}`.trim();

    const studentDetails = [
        { label: "Email", value: student.email || "N/A" },
        { label: "Grade Level", value: student.grade_level || "N/A" },
        { label: "Student Status", value: formatValue(student.status) },
    ];

    const enrollmentDetails = [
        { label: "Committee", value: formatValue(enrollment.committee) },
        {
            label: "Class Leadership Role",
            value: formatRole(enrollment.officer_role, enrollment.committee),
        },
        { label: "Enrollment Status", value: formatValue(enrollment.status) },
        { label: "Enrolled", value: formatDate(enrollment.enrolled_at) },
        { label: "Removed", value: formatDate(enrollment.removed_at) },
    ];

    const classDetails = [
        { label: "Class", value: liaClass.name },
        { label: "School", value: school?.name ?? "N/A" },
        { label: "School Year", value: liaClass.school_year },
        { label: "Period", value: liaClass.period || "N/A" },
        { label: "Class Grade", value: liaClass.grade_level || "N/A" },
    ];

    return (
        <div className="mx-auto max-w-5xl">
            <Link
                href={`/teacher/classes/${classId}/students`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to students
            </Link>

            <header className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                            Student Profile
                        </p>
                        <h1 className="mt-2 break-words text-3xl font-semibold [overflow-wrap:anywhere]">
                            {studentName}
                        </h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            Student profile and class enrollment details.
                        </p>
                    </div>

                    <Link
                        href={`/teacher/classes/${classId}/students/${enrollment.id}/edit`}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                    >
                        Edit Student
                    </Link>
                </div>
            </header>

            <section className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-xl font-semibold">Student Details</h2>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        {studentDetails.map((detail) => (
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

                    <div className="mt-6 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Notes
                        </p>
                        <p className="mt-2 break-words text-sm leading-6 text-zinc-700 [overflow-wrap:anywhere]">
                            {student.notes || "No student notes yet."}
                        </p>
                    </div>
                </section>

                <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-xl font-semibold">Class Enrollment</h2>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        {enrollmentDetails.map((detail) => (
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
                </section>
            </section>

            <section className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-semibold">Class Context</h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                    {classDetails.map((detail) => (
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
            </section>
        </div>
    );
}

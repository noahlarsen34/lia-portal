import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/utils/role-guards";
import { updateTeacherProfile } from "./actions";

type TeacherProfilePageProps = {
    searchParams: Promise<{
        success?: string;
        error?: string;
    }>;
};

function formatProgramLevel(programLevel: string | null) {
    switch (programLevel) {
        case "elementary":
            return "Elementary";
        case "middle":
            return "Middle School";
        case "high":
            return "High School";
        case "middle_high":
            return "Middle + High School";
        case "k_8":
            return "K-8";
        case "k_12":
            return "K-12";
        case "other":
            return "Other";
        default:
            return "Not assigned";
    }
}

function formatPortalStatus(status: string | null) {
    switch (status) {
        case "active":
        case "activated":
            return "Account activated";
        case "invited":
            return "Invitation sent";
        case "disabled":
            return "Access disabled";
        default:
            return "Not activated";
    }
}

function formatDate(value: string | null) {
    if(!value) {
        return "N/A";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
}

export default async function TeacherProfilePage({
    searchParams,
}: TeacherProfilePageProps) {
    const { success, error } = await searchParams;
    const { supabase, profile, user } = await requireRole(["teacher"]);
    
    const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select(`
            id,
            school_id,
            first_name,
            last_name,
            name,
            email,
            phone,
            status,
            program_level,
            is_new_teacher,
            portal_access_status,
            invited_at,
            activated_at
        `)
        .eq("profile_id", profile.id)
        .maybeSingle();
    
    if (teacherError) {
        throw new Error(
            `Unable to load teacher profiles: ${teacherError.message}`,
        );
    }

    if (!teacher) {
        redirect("/teacher");
    }

    const { data: school, error: schoolError} = teacher.school_id
        ? await supabase
            .from("schools")
            .select(`
                id,
                name,
                state,
                district_id,
                assigned_rpm_id
            `)
            .eq("id", teacher.school_id)
            .maybeSingle()
        : { data: null, error: null };
    
    if (schoolError) {
        throw new Error(
            `Unable to load teacher school: ${schoolError.message}`,
        );
    }

    const [districtResult, rpmResult] = await Promise.all([
        school?.district_id
            ? supabase
                .from("districts")
                .select("name")
                .eq("id", school.district_id)
                .maybeSingle()
            : Promise.resolve({data: null, error: null}),
        school?.assigned_rpm_id
            ? supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", school.assigned_rpm_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ]);

    const { data: classes, error: classesError } = await supabase
        .from("lia_classes")
        .select(`
            id,
            name,
            school_year,
            period,
            grade_level,
            status,
            updated_at
        `)
        .eq("teacher_profile_id", profile.id)
        .order("updated_at", { ascending: false });

    if (classesError) {
        throw new Error(
            `Unable to load teacher classes: ${classesError.message}`,
        );
    }

    const classRows = classes ?? [];
    const classIds = classRows.map((liaClass) => liaClass.id);

    const { data: enrollmentRows, error: enrollmentError } =
        classIds.length > 0
            ? await supabase
                .from("lia_class_students")
                .select("student_id")
                .in("lia_class_id", classIds)
                .or("status.is.null,status.neq.removed")
            : {
                data: [],
                error: null,
            };

    if (enrollmentError) {
        throw new Error(
            `Unable to load teacher enrollments: ${enrollmentError.message}`,
        );
    }

    const uniqueStudentCount = new Set(
        (enrollmentRows ?? [])
            .map((enrollment) => enrollment.student_id)
            .filter(Boolean),
    ).size;

    const activeClassCount = classRows.filter(
        (liaClass) => liaClass.status === "active",
    ).length;

    const displayName =
        teacher.name ||
        `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
        "LIA Teacher";
    
    const initials = `${teacher.first_name?.[0] ?? ""}${
        teacher.last_name?.[0] ?? ""
    }`.toUpperCase() || "LT";

    const errorMessage =
        error === "missing-name"
            ? "First name and last name are required."
            : error === "invalid-fields"
                ? "One or more fields are too long."
                : error
                    ? "Your profile could not be updated. Please try again."
                    : null;
    
    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-[#c4122f] text-2xl font-bold text-white">
                        {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                            Teacher Profile
                        </p>

                        <h1 className="mt-1 break-words text-3xl font-semibold text-zinc-950">
                            {displayName}
                        </h1>

                        <p className="mt-1 text-sm text-zinc-600">
                            {school?.name?? "No school assigned"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                {teacher.status === "active"
                                    ? "Active"
                                    : "Inactive"}
                            </span>

                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#c4122f]">
                                {formatProgramLevel(teacher.program_level)}
                            </span>

                            {teacher.is_new_teacher ? (
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    First Year with LIA
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            {success === "profile-updated" ? (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    Your profile was updated successfully.
                </div>
            ) : null}

            {errorMessage ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-950">
                            Personal Information
                        </h2>

                        <p className="mt-1 text-sm text-zinc-600">
                            Update your contact information.
                        </p>
                    </div>

                    <form action={updateTeacherProfile} className="mt-6 space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">
                                    First Name
                                </span>
                                <input
                                    name="first_name"
                                    required
                                    maxLength={80}
                                    defaultValue={teacher.first_name ?? ""}
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                                />
                            </label>

                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">
                                    Last Name
                                </span>
                                <input
                                    name="last_name"
                                    required
                                    maxLength={80}
                                    defaultValue={teacher.last_name ?? ""}
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                                />
                            </label>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">
                                    Email
                                </span>
                                <input
                                    value={teacher.email ?? user.email ?? ""}
                                    readOnly
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 text-sm text-zinc-500"
                                />
                                <span className="mt-1 block text-xs text-zinc-500">
                                    Contact your RPM to change your login email.
                                </span>
                            </label>

                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">
                                    Phone
                                </span>
                                <input
                                    name="phone"
                                    type="tel"
                                    maxLength={30}
                                    defaultValue={teacher.phone ?? ""}
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                                />
                            </label>
                        </div>

                        <div className="flex justify-end border-t border-zinc-100 pt-5">
                            <button
                                type="submit"
                                className="inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                            >
                                Save Profile
                            </button>
                        </div>
                    </form>
                </section>

                <div className="space-y-6">
                    <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-zinc-950">
                            LIA Assignment
                        </h2>

                        <dl className="mt-5 space-y-4 text-sm">
                            <div>
                                <dt className="text-zinc-500">School</dt>
                                <dd className="mt-1 font-semibold text-zinc-900">
                                    {school?.name ?? "Not assigned"}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-zinc-500">District</dt>
                                <dd className="mt-1 font-semibold text-zinc-900">
                                    {districtResult.data?.name ?? "Not assigned"}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-zinc-500">State</dt>
                                <dd className="mt-1 font-semibold text-zinc-900">
                                    {school?.state ?? "Not assigned"}
                                </dd>
                            </div>

                            <div>
                                <dd className="text-zinc-500">Assigned RPM</dd>
                                <dd className="mt-1 font-semibold text-zinc-900">
                                    {rpmResult.data?.full_name ?? "Not assigned"}
                                </dd>

                                {rpmResult.data?.email ? (
                                    <a
                                        href={`mailto:${rpmResult.data.email}`}
                                        className="mt-1 inline-block break-all text-sm font-medium text-[#c4122f] hover:underline"
                                    >
                                        {rpmResult.data.email}
                                    </a>
                                ) : null}
                            </div>

                            <div>
                                <dt className="text-zinc-500">Program Level</dt>
                                <dd className="mt-1 font-semibold text-zinc-900">
                                    {formatProgramLevel(teacher.program_level)}
                                </dd>
                            </div>
                        </dl>

                        <p className="mt-5 rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
                            Contact your RPM or an administrator if this 
                            assignment information is incorrect.
                        </p>
                    </section>

                    <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-zinc-950">
                            Portal Account
                        </h2>

                        <dl className="mt-5 space-y-4 text-sm">
                            <div>
                                <dt className="text-zinc-500">Portal Access</dt>
                                <dd className="mt-1 font-semibold text-zinc-900">
                                    {formatPortalStatus(
                                        teacher.portal_access_status,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-zinc-500">Invited</dt>
                                <dd className="mt-1 font-semibold text-zinc-900">
                                    {formatDate(teacher.invited_at)}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-zinc-500">Activated</dt>
                                <dd className="mt-1 font-semibold text-zinc-900">
                                    {formatDate(teacher.activated_at)}
                                </dd>
                            </div>
                        </dl>
                    </section>
                </div>
            </div>

            <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-950">
                            Teaching Overview
                        </h2>

                        <p className="mt-1 text-sm text-zinc-600">
                            A summary of your current LIA classes and students.
                        </p>
                    </div>

                    <Link
                        href="/teacher/classes"
                        className="text-sm font-semibold text-[#c4122f] hover:underline"
                    >
                        View all classes
                    </Link>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-sm text-zinc-500">
                            Total Classes
                        </p>

                        <p className="mt-1 text-2xl font-semibold text-zinc-950">
                            {classRows.length}
                        </p>
                    </div>

                    <div className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-sm text-zinc-500">
                            Active Classes
                        </p>

                        <p className="mt-1 text-2xl font-semibold text-zinc-950">
                            {activeClassCount}
                        </p>
                    </div>

                    <div className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-sm text-zinc-500">
                            Enrolled Students
                        </p>

                        <p className="mt-1 text-2xl font-semibold text-zinc-950">
                            {uniqueStudentCount}
                        </p>
                    </div>
                </div>

                {classRows.length > 0 ? (
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                            Recent Classes
                        </h3>

                        <div className="mt-3 divide-y divide-zinc-100 rounded-md border border-zinc-100">
                            {classRows.slice(0, 3).map((liaClass) => (
                                <Link
                                    key={liaClass.id}
                                    href={`/teacher/classes/${liaClass.id}`}
                                    className="flex flex-col gap-2 p-4 transition hover:bg-red-50 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="break-words font-semibold text-zinc-950 [overflow-wrap:anywhere]">
                                            {liaClass.name}
                                        </p>

                                        <p className="mt-1 text-sm text-zinc-500">
                                            {liaClass.school_year}
                                            {liaClass.period
                                                ? ` · ${liaClass.period}`
                                                : ""}
                                            {liaClass.grade_level
                                                ? ` · ${liaClass.grade_level}`
                                                : ""}
                                        </p>
                                    </div>

                                    <span className="shrink-0 text-sm font-semibold capitalize text-[#c4122f]">
                                        {liaClass.status}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 rounded-md border border-dashed border-zinc-200 p-6 text-center">
                        <p className="text-sm text-zinc-600">
                            You have not created any classes yet.
                        </p>

                        <Link
                            href="/teacher/classes/new"
                            className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Create Your First Class
                        </Link>
                    </div>
                )}
            </section>

            <section className="flex flex-wrap gap-3">
                <Link
                    href="/teacher/classes"
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c4122f] hover:bg-red-50"
                >
                    Manage My Classes
                </Link>

                <Link
                    href="/teacher/resources"
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c4122f] hover:bg-red-50"
                >
                    Open Curriculum
                </Link>

                <Link
                    href="/teacher/modules"
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c4122f] hover:bg-red-50"
                >
                    Teacher Modules
                </Link>
            </section>
        </div>
    );
}

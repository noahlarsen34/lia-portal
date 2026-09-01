import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { formatStudentTier } from "@/utils/student-tier";
import { toLeadershipOptionValue } from "@/utils/class-leadership-options";
import { LeadershipExportButton } from "./leadership-export-button";

type LeadershipPageProps = {
    params: Promise<{
        classId: string;
    }>;
    searchParams: Promise<{
        role?: string;
        committee?: string;
        tier?: string;
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

function formatRosterRole(role: string | null | undefined, committee: string | null | undefined) {
    if (role === "president") return "Class President";
    if (role === "secretary") return "Class Secretary";
    if (role === "historian") return 'Class Historian';

    if (role === "vice_president") {
        return committee ? `${formatRosterValue(committee)} VP` : "Committee VP";
    }

    return role ? formatRosterValue(role) : "Member";
}

export default async function LeadershipPage({
    params,
    searchParams,
}: LeadershipPageProps) {
    const { classId } = await params;
    const filters = await searchParams;
    const { supabase, profile} = await requireTeacher();

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
        .select(`
                id,
                status,
                tier,
                committee,
                officer_role,
                students (
                    id,
                    first_name,
                    last_name,
                    email,
                    grade_level
                ) 
            `)
        .eq("lia_class_id", liaClass.id)
        .or("status.is.null,status.neq.removed")
        .order("officer_role", {ascending: true});

    const [
        { data: committeeOptions },
        { data: roleOptions },
    ] = await Promise.all([
        supabase
            .from("lia_class_committees")
            .select("id, name")
            .eq("lia_class_id", liaClass.id)
            .is("archived_at", null)
            .order("sort_order")
            .order("name"),
        supabase
            .from("lia_class_roles")
            .select("id, name, is_default, max_assignees")
            .eq("lia_class_id", liaClass.id)
            .is("archived_at", null)
            .order("sort_order")
            .order("name"),
    ]);
    
    const roleFilter = filters.role ?? "all";
    const committeeFilter = filters.committee ?? "all";
    const tierFilter = filters.tier ?? "all";
    const shouldApplyCommitteeFilter = committeeFilter !== "all";
    const filterFormKey = `${roleFilter}-${committeeFilter}-${tierFilter}`;

    const filteredEnrollments = (enrollments ?? []).filter((enrollment) => {
        if (roleFilter !== "all" && enrollment.officer_role !== roleFilter) {
            return false;
        }

        if (shouldApplyCommitteeFilter) {
            if (committeeFilter === "none") {
                return !enrollment.committee;
            }

            return enrollment.committee === committeeFilter;
        }

        if (tierFilter !== "all" && enrollment.tier !== tierFilter) {
            return false;
        }

        return true;
    });

    function getStudentName(enrollment: (typeof filteredEnrollments)[number] | undefined) {
        if (!enrollment) return "Unassigned";

        const student = Array.isArray(enrollment.students)
            ? enrollment.students[0]
            : enrollment.students;
        
        return student  
            ? `${student.first_name} ${student.last_name}`
            : "Unknown student";
    }

    const president = (enrollments ?? []).find(
            (enrollment) => enrollment.officer_role === "president",
    );

    const secretary = (enrollments ?? []).find(
        (enrollment) => enrollment.officer_role === "secretary",
    );

    const historian = (enrollments ?? []).find(
        (enrollment) => enrollment.officer_role === "historian",
    );

    const professionalVp = (enrollments ?? []).find(
        (enrollment) =>
            enrollment.officer_role === "vice_president" && 
            enrollment.committee === "professional",
    );

    const serviceVp = (enrollments ?? []).find(
        (enrollment) =>
            enrollment.officer_role === "vice_president" &&
            enrollment.committee === "service",
    );

    const socialVp = (enrollments ?? []).find(
        (enrollment) =>
            enrollment.officer_role === "vice_president" &&
            enrollment.committee === "social",
    );

    const standardLeadershipCards = [
        {
            title: "President",
            student: getStudentName(president),
            href: president
                ? `/teacher/classes/${liaClass.id}/students/${president.id}`
                : null,
        },
        {
            title: "Secretary",
            student: getStudentName(secretary),
            href: secretary
                ? `/teacher/classes/${liaClass.id}/students/${secretary.id}`
                : null,
        },
        {
            title: "Historian",
            student: getStudentName(historian),
            href: historian
                ? `/teacher/classes/${liaClass.id}/students/${historian.id}`
                : null,
        },
        {
            title: "Professional VP",
            student: getStudentName(professionalVp),
            href: professionalVp
                ? `/teacher/classes/${liaClass.id}/students/${professionalVp.id}`
                : null,
        },
        {
            title: "Service VP",
            student: getStudentName(serviceVp),
            href: serviceVp
                ? `/teacher/classes/${liaClass.id}/students/${serviceVp.id}`
                : null,
        },
        {
            title: "Social VP",
            student: getStudentName(socialVp),
            href: socialVp
                ? `/teacher/classes/${liaClass.id}/students/${socialVp.id}`
                : null,
        },
    ];

    const customRoleCards = (roleOptions ?? [])
        .filter((role) => !role.is_default)
        .map((role) => {
            const roleValue = toLeadershipOptionValue(role.name);
            const assignedEnrollments = (enrollments ?? []).filter(
                (enrollment) => enrollment.officer_role === roleValue,
            );
            const firstAssignment = assignedEnrollments[0];
            const hasMultipleAssignments = assignedEnrollments.length > 1;

            return {
                title: role.name,
                student: hasMultipleAssignments
                    ? `${assignedEnrollments.length} assigned`
                    : getStudentName(firstAssignment),
                href: hasMultipleAssignments
                    ? `/teacher/classes/${liaClass.id}/leadership?role=${encodeURIComponent(roleValue)}`
                    : firstAssignment
                        ? `/teacher/classes/${liaClass.id}/students/${firstAssignment.id}`
                        : null,
            };
        });

    const leadershipCards = [
        ...standardLeadershipCards,
        ...customRoleCards,
    ];

    return (
        <div className="mx-auto max-w-7xl">
            <Link
                href={`/teacher/classes/${liaClass.id}`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to class
            </Link>

            <section className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Leadership
                </p>
                <h1 className="mt-2 text-3xl font-semibold">{liaClass.name}</h1>
                <p className="mt-1 text-sm text-zinc-600">
                    View class officers, committee members, and leadership assignments.
                </p>
                <Link
                    href={`/teacher/classes/${liaClass.id}/leadership/settings`}
                    className="mt-4 inline-flex h-10 items-center rounded-md border border-red-200 px-4 text-sm font-semibold text-[#c4122f] transition hover:bg-red-50"
                >
                    Manage Committees &amp; Roles
                </Link>

                <form
                    key={filterFormKey}
                    className="mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-3"
                >
                    <label>
                        <span className="text-sm font-medium text-zinc-800">Role</span>
                        <select
                            name="role"
                            defaultValue={roleFilter}
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                        >
                            <option value="all">All roles</option>
                            {(roleOptions ?? []).map((role) => (
                                <option
                                    key={role.id}
                                    value={toLeadershipOptionValue(role.name)}
                                >
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span className="text-sm font-medium text-zinc-800">Committee</span>
                        <select
                            name="committee"
                            defaultValue={committeeFilter}
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                        >
                            <option value="all">All committees</option>
                            {(committeeOptions ?? []).map((committee) => (
                                <option
                                    key={committee.id}
                                    value={toLeadershipOptionValue(committee.name)}
                                >
                                    {committee.name}
                                </option>
                            ))}
                            <option value="none">No committee</option>
                        </select>
                    </label>

                    <label>
                        <span className="text-sm font-medium text-zinc-800">Tier</span>
                        <select
                            name="tier"
                            defaultValue={tierFilter}
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                        >
                            <option value="all">All tiers</option>
                            <option value="tier_1">Tier 1</option>
                            <option value="tier_2">Tier 2</option>
                            <option value="tier_3">Tier 3</option>
                        </select>
                    </label>

                    <div className="sm:col-span-3 flex gap-3">
                        <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white"
                        >
                            Apply Filters
                        </button>

                        <Link
                            href={`/teacher/classes/${liaClass.id}/leadership`}
                            replace
                            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-semibold text-zinc-700"
                        >
                            Clear
                        </Link>
                    </div>

                </form>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {leadershipCards.map((card) => {
                    const content = (
                        <>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                {card.title}
                            </p>
                            <p
                                className={
                                    card.href
                                        ? "mt-2 text-lg font-semibold text-zinc-950"
                                        : "mt-2 text-lg font-semibold text-zinc-400"
                                }
                            >
                                {card.student}
                            </p>
                        </>
                    );

                    return card.href ? (
                        <Link
                            key={card.title}
                            href={card.href}
                            className="rounded-md border border-red-100 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md"
                        >
                            {content}
                        </Link>
                    ) : (
                        <div
                            key={card.title}
                            className="rounded-md border border-dashed border-zinc-200 bg-white p-5 shadow-sm"
                        >
                            {content}
                        </div>
                    );
                })}
            </section>

            <section className="mt-5 overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                    <div>
                        <h2 className="text-xl font-semibold">
                            Leadership Directory
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600">
                            {filteredEnrollments.length} students match the selected filters.
                        </p>
                    </div>

                    <LeadershipExportButton
                        classId={liaClass.id}
                        roleFilter={roleFilter}
                        committeeFilter={committeeFilter}
                        tierFilter={tierFilter}
                        disabled={filteredEnrollments.length === 0}
                    />
                </div>

                {filteredEnrollments.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-zinc-500 sm:px-6">
                        No students match these leadership filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1040px] table-fixed divide-y divide-zinc-200 text-sm">
                            <colgroup>
                                <col className="w-[15%]" />
                                <col className="w-[20%]" />
                                <col className="w-[8%]" />
                                <col className="w-[10%]" />
                                <col className="w-[14%]" />
                                <col className="w-[18%]" />
                                <col className="w-[10%]" />
                            </colgroup>
                            <thead className="bg-zinc-50 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">Email</th>
                                    <th className="px-5 py-3">Grade</th>
                                    <th className="px-5 py-3">Tier</th>
                                    <th className="px-5 py-3">Committee</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-zinc-100">
                                {filteredEnrollments.map((enrollment) => {
                                    const student = Array.isArray(enrollment.students)
                                        ? enrollment.students[0]
                                        : enrollment.students;
                                    
                                    return (
                                        <tr key={enrollment.id} className="align-top hover:bg-zinc-50/70">
                                            <td className="px-5 py-4 font-semibold">
                                                <Link
                                                    href={`/teacher/classes/${liaClass.id}/students/${enrollment.id}`}
                                                    prefetch={false}
                                                    className="text-zinc-950 hover:text-[#c4122f]"
                                                >
                                                    {student
                                                        ? `${student.first_name} ${student.last_name}`
                                                        : "Unknown Student"}
                                                </Link>
                                            </td>
                                            <td className="break-words px-5 py-4 text-zinc-700 [overflow-wrap:anywhere]">
                                                {student?.email || "N/A"}
                                            </td>
                                            <td className="px-5 py-4 text-zinc-700">
                                                {student?.grade_level || "N/A"}
                                            </td>
                                            <td className="px-5 py-4 text-zinc-700">
                                                {formatStudentTier(enrollment.tier)}
                                            </td>
                                            <td className="px-5 py-4 text-zinc-700">
                                                {formatRosterValue(enrollment.committee)}
                                            </td>
                                            <td className="px-5 py-4 text-zinc-700">
                                                {formatRosterRole(enrollment.officer_role, enrollment.committee)}
                                            </td>
                                            <td className="px-5 py-4">
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
                )}
            </section>
        </div>
    );
}

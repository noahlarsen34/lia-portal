import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { formatStudentTier } from "@/utils/student-tier";
import {
    ClassRoster,
    type RosterStudent,
} from "./class-roster";

type StaffClassDetialsPageProps = {
    params: Promise<{
        classId: string;
    }>;
};

function formatRosterValue(value: string | null | undefined) {
    return value
        ? value
            .split("_")
            .map(
                (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1),
            )
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

    return role ? formatRosterValue(role) : "Member";
}

const dayLabels:  Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
};

const timezoneLabels: Record<string, string> = {
    "America/Los_Angeles": "Pacific Time",
    "America/Denver": "Mountain Time",
    "America/Phoenix": "Arizona Time",
    "America/Chicago": "Central Time",
    "America/New_York": "Eastern Time",
    "America/Anchorage": "Alaska Time",
    "Pacific/Honolulu": "Hawaii Time",
};

function formatClassTime(value: string | null | undefined) {
    if(!value) {
        return "Not provided";
    }

    const [hourValue, minuteValue] = value.split(":");
    const hour = Number(hourValue);
    const minute = Number(minuteValue);

    if (
        !Number.isInteger(hour) ||
        !Number.isInteger(minute)
    ) {
        return value;
    }

    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${String(minute).padStart(
        2,
        "0",
    )} ${suffix}`;
}

function formatClassDate(value: string | null | undefined) {
    if (!value) {
        return "Not provided";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function formatMeetingDays(
    meetingDays: string[] | null | undefined,
) {
    if (!meetingDays || meetingDays.length === 0) {
        return "Not provided";
    }

    return meetingDays 
        .map((day) => dayLabels[day] ?? formatRosterValue(day))
        .join(", ");
}

function formatScheduleType(
    value: string | null | undefined,
) {
    switch (value) {
        case "traditional":
            return "Traditional schedule";
        case "block":
            return "Block schedule";
        case "other":
            return "Other schedule";
        default:
            return "Not provided";
    }
}

function formatBlockDesignation(
    value: string | null | undefined,
) {
    switch (value) {
        case "a_day":
            return "A Day";
        case "b_day":
            return " B Day";
        case "both":
            return "Both A and B Days";
        default:
            return "Not provided";
    }
}

export default async function StaffClassDetailsPage({
    params,
}: StaffClassDetialsPageProps) {
    const { classId } = await params;
    const { supabase, profile } = await requireStaff();

    const { data: liaClass, error: classError } = await supabase
        .from("lia_classes")
        .select(
            `
                id,
                name,
                school_id,
                teacher_profile_id,
                period,
                grade_level,
                school_year,
                status,
                schedule_type,
                meeting_days,
                start_time,
                end_time,
                start_date,
                end_date,
                timezone,
                block_designation,
                notes
            `,
        )
        .eq("id", classId)
        .maybeSingle();
    
    if (classError) {
        throw new Error(
            `Unable to load class: ${classError.message}`
        );
    }

    if (!liaClass) {
        notFound();
    }

    let schoolQuery = supabase
        .from("schools")
        .select("id, name, state, assigned_rpm_id")
        .eq("id", liaClass.school_id);
    
    if (profile.role === "rpm") {
        schoolQuery = schoolQuery.eq(
            "assigned_rpm_id",
            profile.id,
        );
    }

    const { data: school, error: schoolError } =
        await schoolQuery.maybeSingle();
    
    if (schoolError) {
        throw new Error(
            `Unable to load class school: ${schoolError.message}`
        );
    }

    if (!school) {
        notFound();
    }

    const [teacherResult, enrollmentResult] = await Promise.all([
        supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", liaClass.teacher_profile_id)
            .maybeSingle(),
        
        supabase
            .from("lia_class_students")
            .select(
                `
                    id,
                    status,
                    tier,
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
            .or("status.is.null,status.neq.removed")
            .order("enrolled_at", { ascending: false }),
    ]);

    if (teacherResult.error) {
        throw new Error(
            `Unable to load class teacher: ${teacherResult.error.message}`,
        );
    }

    if (enrollmentResult.error) {
        throw new Error(
            `Unable to load class roster: ${enrollmentResult.error.message}`,
        );
    }

    const rosterStudents: RosterStudent[] = (
        enrollmentResult.data ?? []
    ).flatMap((enrollment) => {
        const relatedStudent = enrollment.students;
        const student = Array.isArray(relatedStudent)
            ? relatedStudent[0]
            : relatedStudent;
        
        if (!student) {
            return [];
        }

        return [
            {
                enrollmentId: enrollment.id,
                studentId: student.id,
                firstName: student.first_name ?? "",
                lastName: student.last_name ?? "",
                email: student.email || "N/A",
                gradeLevel: student.grade_level || "N/A",
                committee: formatRosterValue(
                    enrollment.committee,
                ),
                leadershipRole: formatRosterRole(
                    enrollment.officer_role,
                    enrollment.committee,
                ),
                tier: formatStudentTier(enrollment.tier),
                status:
                    enrollment.status === "inactive"
                        ? "Inactive"
                        : "Active",
                enrolledAt: enrollment.enrolled_at ?? "",
            },
        ];
    });

    const teacher = teacherResult.data;

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <Link
                        href="/classes"
                        className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to classes
                    </Link>

                    <header className="mt-5">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                            Staff Class Roster
                        </p>

                        <h1 className="mt-2 break-words text-3xl font-semibold">
                            {liaClass.name}
                        </h1>

                        <p className="mt-2 text-sm text-zinc-600">
                            View class information and current students
                            enrollment.
                        </p>
                    </header>

                    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    School
                                </p>
                                <p className="mt-2 font-semibold text-zinc-900">
                                    {school.name}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    {school.state || "Unknown state"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Teacher
                                </p>
                                <p className="mt-2 font-semibold text-zinc-900">
                                    {teacher?.full_name ??
                                        "Unknown teacher"}
                                </p>
                                <p className="mt-1 break-all text-sm text-zinc-500">
                                    {teacher?.email || "No email"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Class Details
                                </p>
                                <p className="mt-2 text-sm text-zinc-700">
                                    Period:{" "}
                                    <span className="font-semibold text-zinc-900">
                                        {liaClass.period || "N/A"}
                                    </span>
                                </p>
                                <p className="mt-1 text-sm text-zinc-700">
                                    Grade:{" "}
                                    <span className="font-semibold text-zinc-900">
                                        {liaClass.grade_level || "N/A"}
                                    </span>
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Current Students
                                </p>
                                <p className="mt-2 text-3xl font-semibold text-zinc-950">
                                    {rosterStudents.length}
                                </p>

                                <span
                                    className={
                                        liaClass.status === "active"
                                            ? "mt-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                                            : "mt-2 inline-flex rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600"
                                    }
                                >
                                    {liaClass.status === "active"
                                        ? "Active class"
                                        : "Inactive class"}
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
                            School year:{" "}
                            <span className="font-semibold text-zinc-900">
                                {liaClass.school_year || "Not provided"}
                            </span>
                        </div>
                    </section>

                    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                                Class Schedule
                            </p>

                            <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
                                Schedule Details
                            </h2>

                            <p className="mt-1 text-sm text-zinc-600">
                                The class schedule and additional details provided
                                by the teacher.
                            </p>
                        </div>

                        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Schedule Type
                                </p>

                                <p className="mt-2 font-semibold text-zinc-950">
                                    {formatScheduleType(
                                        liaClass.schedule_type,
                                    )}
                                </p>

                                {liaClass.schedule_type === "block" ? (
                                    <p className="mt-1 text-sm text-zinc-600">
                                        {formatBlockDesignation(
                                            liaClass.block_designation,
                                        )}
                                    </p>
                                ): null}
                            </div>

                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Meeting Days
                                </p>

                                <p className="mt-2 font-semibold leading-6 text-zinc-950">
                                    {formatMeetingDays(
                                        liaClass.meeting_days
                                    )}
                                </p>
                            </div>

                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Class Time
                                </p>

                                <p className="mt-2 font-semibold text-zinc-950">
                                    {liaClass.start_time &&
                                    liaClass.end_time
                                        ? `${formatClassTime(
                                            liaClass.start_time,
                                        )} - ${formatClassTime(
                                            liaClass.end_time,
                                        )}`
                                        : "Not provided" }
                                </p>

                                <p className="mt-1 text-sm text-zinc-600">
                                    {liaClass.timezone
                                        ? timezoneLabels[
                                            liaClass.timezone
                                        ] ?? liaClass.timezone
                                        : "Timezone not provided"}
                                </p>
                            </div>

                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Class Dates
                                </p>

                                <p className="mt-2 font-semibold text-zinc-950">
                                    {liaClass.start_date
                                        ? formatClassDate(
                                            liaClass.start_date,
                                        )
                                        : "Not provided"}
                                </p>

                                <p className="mt-1 text-sm text-zinc-600">
                                    Through{" "}
                                    {liaClass.end_date
                                        ? formatClassDate(
                                            liaClass.end_date,
                                        )
                                        : "Not provided"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-lg border border-zinc-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Class &amp; Schedule Notes
                            </p>

                            {liaClass.notes ? (
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                                    {liaClass.notes}
                                </p>
                            ) : (
                                <p className="mt-3 text-sm text-zinc-500">
                                    No additional class or schedule notes were
                                    provided.
                                </p>
                            )}
                        </div>
                    </section>

                    <ClassRoster students={rosterStudents} />
                </div>
            </section>
        </main>
    );
}

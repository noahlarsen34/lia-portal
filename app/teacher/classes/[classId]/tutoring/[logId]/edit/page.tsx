import Link from "next/link";
import { requireTeacher } from "@/utils/role-guards";
import { updateTutoringLog } from "../../actions";

type EditTutoringLogPageProps = {
    params: Promise<{
        classId: string;
        logId: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

const fieldClasses =
    "mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100";

function formatTimeForInput(value: string | null | undefined) {
    return value ? value.slice(0, 5) : "";
}

function EditLogError({
    classId,
    title,
    message,
}: {
    classId: string;
    title: string;
    message: string;
}) {
    return (
        <div className="mx-auto max-w-3xl">
            <Link
                href={`/teacher/classes/${classId}/tutoring`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to tutoring logs
            </Link>

            <section className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Edit Tutoring Log
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
                    {title}
                </h1>
                <p className="mt-2 text-sm text-zinc-600">{message}</p>
            </section>
        </div>
    );
}

export default async function EditTutoringLogPage({
    params,
    searchParams,
}: EditTutoringLogPageProps) {
    const { classId, logId } = await params;
    const { error } = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name, teacher_profile_id")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();

    if (!liaClass) {
        return (
            <EditLogError
                classId={classId}
                title="Class not found"
                message="This class could not be found, or it is not assigned to your teacher account."
            />
        );
    }

    const { data: log } = await supabase
        .from("tutoring_logs")
        .select(
            `
                id,
                lia_class_id,
                student_name_snapshot,
                school_site,
                class_period,
                activity_type,
                session_date,
                arrival_time,
                departure_time,
                mentor_initials,
                major_activities,
                comments,
                elementary_mentee_name,
                mentee_grade,
                english_language_proficiency,
                cooperating_elementary_teacher,
                status
            `,
        )
        .eq("id", logId)
        .maybeSingle();

    if (!log || log.lia_class_id !== classId) {
        return (
            <EditLogError
                classId={classId}
                title="Log not found"
                message="This tutoring log could not be found for this class. Go back to the tutoring table and try the Edit button again."
            />
        );
    }

    const updateLog = updateTutoringLog.bind(null, classId, log.id);

    return (
        <div className="mx-auto max-w-3xl">
            <Link
                href={`/teacher/classes/${classId}/tutoring`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to tutoring logs
            </Link>

            <section className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                        Edit Tutoring Log
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold">
                        {log.student_name_snapshot}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        Update this tutoring or service submission for {liaClass.name}.
                    </p>
                </div>

                {error ? (
                    <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error === "missing-fields"
                            ? "Date, arrival time, and departure time are required."
                            : error === "invalid-time"
                                ? "Departure time must be after arrival time."
                                : "Could not update this log. Please try again."}
                    </div>
                ) : null}

                <form action={updateLog} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Activity Type
                            </span>
                            <select
                                name="activityType"
                                defaultValue={log.activity_type}
                                className={fieldClasses}
                            >
                                <option value="tutoring">Tutoring</option>
                                <option value="service">Service</option>
                            </select>
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Status
                            </span>
                            <select
                                name="status"
                                defaultValue={log.status}
                                className={fieldClasses}
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Date
                            </span>
                            <input
                                type="date"
                                name="sessionDate"
                                required
                                defaultValue={log.session_date}
                                className={fieldClasses}
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Arrival Time
                            </span>
                            <input
                                type="time"
                                name="arrivalTime"
                                required
                                defaultValue={formatTimeForInput(log.arrival_time)}
                                className={fieldClasses}
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Departure Time
                            </span>
                            <input
                                type="time"
                                name="departureTime"
                                required
                                defaultValue={formatTimeForInput(log.departure_time)}
                                className={fieldClasses}
                            />
                        </label>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                School Site
                            </span>
                            <input
                                name="schoolSite"
                                defaultValue={log.school_site ?? ""}
                                className={fieldClasses}
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Class Period
                            </span>
                            <input
                                name="classPeriod"
                                defaultValue={log.class_period ?? ""}
                                className={fieldClasses}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium text-zinc-800">
                            Mentor&apos;s Initials
                        </span>
                        <input
                            name="mentorInitials"
                            defaultValue={log.mentor_initials ?? ""}
                            className={fieldClasses}
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-zinc-800">
                            Major Activities
                        </span>
                        <textarea
                            name="majorActivities"
                            rows={4}
                            required
                            defaultValue={log.major_activities ?? ""}
                            className={fieldClasses}
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-zinc-800">
                            Comments
                        </span>
                        <textarea
                            name="comments"
                            rows={3}
                            defaultValue={log.comments ?? ""}
                            className={fieldClasses}
                        />
                    </label>

                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                        <h2 className="text-lg font-semibold text-zinc-900">
                            Mentee Information
                        </h2>

                        <div className="mt-4 space-y-5">
                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">
                                    Elementary Mentee
                                </span>
                                <input
                                    name="elementaryMenteeName"
                                    defaultValue={log.elementary_mentee_name ?? ""}
                                    className={fieldClasses}
                                />
                            </label>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <label className="block">
                                    <span className="text-sm font-medium text-zinc-800">
                                        Mentee&apos;s Grade in School
                                    </span>
                                    <input
                                        name="menteeGrade"
                                        defaultValue={log.mentee_grade ?? ""}
                                        className={fieldClasses}
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-medium text-zinc-800">
                                        English Language Proficiency
                                    </span>
                                    <select
                                        name="englishLanguageProficiency"
                                        defaultValue={
                                            log.english_language_proficiency ?? ""
                                        }
                                        className={fieldClasses}
                                    >
                                        <option value="">Select one</option>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </label>
                            </div>

                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">
                                    Cooperating Elementary Teacher
                                </span>
                                <input
                                    name="cooperatingElementaryTeacher"
                                    defaultValue={
                                        log.cooperating_elementary_teacher ?? ""
                                    }
                                    className={fieldClasses}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                        <Link
                            href={`/teacher/classes/${classId}/tutoring`}
                            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c4122f] sm:w-auto"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                        >
                            Save Log
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

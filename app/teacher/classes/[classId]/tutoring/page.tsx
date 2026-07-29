import Link from "next/link";
import { headers } from "next/headers";
import { Check, Download, Pencil, X } from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import {
    approveTutoringLog,
    rejectTutoringLog,
    updateTutoringLog,
    deleteTutoringLog,
} from "./actions";
import QRCode from "qrcode";
import DeleteLogButton from "./delete-log-button";
import { TutoringExportButton } from "./tutoring-export-button";

type TutoringPageProps = {
    params: Promise<{
        classId: string;
    }>;
    searchParams: Promise<{
        editLogId?: string;
        error?: string;
    }>;
};

const fieldClasses =
    "mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100";

function formatHours(minutes: number) {
    return (minutes /60).toFixed(2);
}

function formatTimeForInput(value: string | null | undefined) {
    return value ? value.slice(0, 5) : "";
}

function formatStatus(status: string | null | undefined) {
    return status
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : "Pending";
}

export default async function ClassTutoringPage({
    params,
    searchParams,
}: TutoringPageProps) {
    const { classId } = await params;
    const { editLogId, error } = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name, period, school_year, teacher_profile_id, application_token")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass) {
        return (
            <div className="mx-auto max-w-4xl">
                <p className="text-sm font-semibold text-[#c4122f]">
                    Class not found.
                </p>
            </div>
        );
    }

    if (editLogId) {
        const { data: editLog } = await supabase
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
            .eq("id", editLogId)
            .maybeSingle();

        if (!editLog || editLog.lia_class_id !== classId) {
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
                            Log not found
                        </h1>
                        <p className="mt-2 text-sm text-zinc-600">
                            This tutoring log could not be found for this class.
                        </p>
                    </section>
                </div>
            );
        }

        const updateLog = updateTutoringLog.bind(null, classId, editLog.id);

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
                            {editLog.student_name_snapshot}
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
                                    defaultValue={editLog.activity_type}
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
                                    defaultValue={editLog.status}
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
                                    defaultValue={editLog.session_date}
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
                                    defaultValue={formatTimeForInput(editLog.arrival_time)}
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
                                    defaultValue={formatTimeForInput(editLog.departure_time)}
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
                                    defaultValue={editLog.school_site ?? ""}
                                    className={fieldClasses}
                                />
                            </label>

                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">
                                    Class Period
                                </span>
                                <input
                                    name="classPeriod"
                                    defaultValue={editLog.class_period ?? ""}
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
                                defaultValue={editLog.mentor_initials ?? ""}
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
                                defaultValue={editLog.major_activities ?? ""}
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
                                defaultValue={editLog.comments ?? ""}
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
                                        defaultValue={editLog.elementary_mentee_name ?? ""}
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
                                            defaultValue={editLog.mentee_grade ?? ""}
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
                                                editLog.english_language_proficiency ?? ""
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
                                            editLog.cooperating_elementary_teacher ?? ""
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

    const { data: logs } = await supabase
        .from("tutoring_logs")
        .select("*")
        .eq("lia_class_id", classId)
        .order("session_date", { ascending: false })
        .order("submitted_at", { ascending: false })
    
    const countedLogs =
        logs?.filter((log) => log.status !== "rejected") ?? [];

    const tutoringMinutes = countedLogs
        .filter((log) => log.activity_type === "tutoring")
        .reduce((total, log) => total + Number(log.duration_minutes ?? 0), 0);

    const serviceMinutes = countedLogs
        .filter((log) => log.activity_type === "service")
        .reduce((total, log) => total + Number(log.duration_minutes ?? 0), 0);
    
    const pendingCount =
        logs?.filter((log) => log.status === "pending").length ?? 0;
    
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
    const protocol =
        headersList.get("x-forwarded-proto") ??
        (host?.includes("localhost") ? "http" : "https");
    const baseUrl = host
        ? `${protocol}://${host}`
        : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    
    const studentFormUrl = `${baseUrl}/tutoring/${liaClass.application_token}`;

    const studentFormQrCode = await QRCode.toDataURL(studentFormUrl, {
        width: 280,
        margin: 2,
        color: {
            dark: "#111827",
            light: "#ffffff",
        },
    });

    const qrCodeFileName = `${
        liaClass.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "lia-class"
    }-tutoring-qr-code.png`;

    return (
        <div className="mx-auto max-w-7xl">
            <Link
                href={`/teacher/classes/${classId}`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to class
            </Link>

            <section className="mt-5 rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Tutoring
                </p>

                <h1 className="mt-2 text-3xl font-semibold">
                    Tutoring Timesheet and Daily Log
                </h1>

                <p className="mt-2 text-sm text-zinc-600">
                    Review tutoring and service logs submitted by students.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                            Tutoring Hours
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                            {formatHours(tutoringMinutes)}
                        </p>
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                            Service Hours
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                            {formatHours(serviceMinutes)}
                        </p>
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                            Pending Logs
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                            {pendingCount}
                        </p>
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 md:col-span-1">
                        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                            Student Form
                        </p>
                        
                        <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
                            <img
                                src={studentFormQrCode}
                                alt="QR code for the student tutoring log form"
                                className="mx-auto h-36 w-36"
                            />
                        </div>

                        <a
                            href={studentFormQrCode}
                            download={qrCodeFileName}
                            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c4122f] px-3 text-sm font-semibold text-white transition hover:bg-[#a70d25] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4122f] focus-visible:ring-offset-2"
                        >
                            <Download aria-hidden="true" className="size-4" />
                            Download QR code
                        </a>

                        <a
                            href={studentFormUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 block break-all text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
                        >
                            {studentFormUrl}
                        </a>

                        <p className="mt-2 text-xs text-zinc-500">
                            Students can scan this code or open the link to submit tutoring and service logs.
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">
                            Tutoring and Service Logs
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600">
                            Export the complete class timesheet to Google Sheets.
                        </p>
                    </div>

                    <TutoringExportButton
                        classId={liaClass.id}
                        disabled={!logs?.length}
                    />
                </div>

                <div className="mt-4 overflow-x-auto rounded-md border border-zinc-200">
                    <table className="w-full min-w-[1100px] text-left text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                            <tr>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Arrival</th>
                                <th className="px-4 py-3">Departure</th>
                                <th className="px-4 py-3">Hours</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Mentor Initials</th>
                                <th className="px-4 py-3">Major Activities</th>
                                <th className="px-4 py-3">Mentee</th>
                                <th className="px-4 py-3">Mentee Grade</th>
                                <th className="px-4 py-3">EL Proficiency</th>
                                <th className="px-4 py-3">Teacher</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-zinc-200">
                            {(logs ?? []).map((log) => (
                                <tr key={log.id}>
                                    <td className="px-4 py-3 font-medium">
                                        {log.student_name_snapshot}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.session_date}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.arrival_time}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.departure_time}
                                    </td>
                                    <td className="px-4 py-3">
                                        {formatHours(Number(log.duration_minutes ?? 0))}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.activity_type}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.mentor_initials ?? "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.major_activities ?? "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.elementary_mentee_name ?? "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.mentee_grade ?? "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.english_language_proficiency ?? "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.cooperating_elementary_teacher ?? "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {formatStatus(log.status)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="grid w-[78px] grid-cols-2 gap-1.5">
                                            <Link
                                                href={`/teacher/classes/${classId}/tutoring?editLogId=${log.id}`}
                                                aria-label={`Edit ${log.student_name_snapshot}'s log`}
                                                title="Edit log"
                                                className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4122f] focus-visible:ring-offset-2"
                                            >
                                                <Pencil aria-hidden="true" className="size-4" />
                                            </Link>

                                            {log.status === "pending" ? (
                                                <>
                                                    <form action={approveTutoringLog.bind(null, classId, log.id)}>
                                                        <button
                                                            type="submit"
                                                            aria-label={`Approve ${log.student_name_snapshot}'s log`}
                                                            title="Approve log"
                                                            className="inline-flex size-9 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                                                        >
                                                            <Check aria-hidden="true" className="size-4" />
                                                        </button>
                                                    </form>

                                                    <form action={rejectTutoringLog.bind(null, classId, log.id)}>
                                                        <button
                                                            type="submit"
                                                            aria-label={`Reject ${log.student_name_snapshot}'s log`}
                                                            title="Reject log"
                                                            className="inline-flex size-9 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                                                        >
                                                            <X aria-hidden="true" className="size-4" />
                                                        </button>
                                                    </form>
                                                </>
                                            ) : null}

                                            <DeleteLogButton
                                                deleteAction={deleteTutoringLog.bind(
                                                    null,
                                                    classId,
                                                    log.id,
                                                )}
                                                studentName={log.student_name_snapshot}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {(logs ?? []).length === 0 && (
                                <tr>
                                    <td
                                        colSpan={14}
                                        className="px-4 py-8 text-center text-zinc-500"
                                    >
                                        No tutoring or service logs yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

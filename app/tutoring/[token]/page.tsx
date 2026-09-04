import { createAdminClient } from "@/utils/supabase/admin";
import { submitTutoringLog } from './actions';
import {
    SubmitTutoringLogButton,
    TutoringFormPersistence,
} from "./form-safety";
import Link from "next/link";

type StudentTutoringFormPageProps = {
    params: Promise<{
        token: string;
    }>;
    searchParams: Promise<{
        student?: string;
        view?: "hours" | "submit";
        submitted?: string;
        error?: string;
    }>;
};

const fieldClasses =
    "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-[#c4122f] focus:outline-none focus:ring-2 focus:ring-red-100";

export default async function StudentTutoringFormPage({
    params,
    searchParams,
}: StudentTutoringFormPageProps) {
    const { token } = await params;
    const query = await searchParams;
    // This route is intentionally public. Use the server-only admin client for
    // the token lookup so an unsigned-in student scanning the QR code can load
    // the same form as a signed-in teacher. Only the limited fields rendered by
    // this page are returned to the browser.
    const supabase = createAdminClient();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select(
            `
                id,
                application_token,
                name,
                period,
                school_year,
                schools (
                    name
                )  
            `,
        )
        .eq("application_token", token)
        .maybeSingle();
    
    const school = Array.isArray(liaClass?.schools)
        ? liaClass.schools[0]
        : liaClass?.schools;
    
    const { data: enrollments } = await supabase
        .from("lia_class_students")
        .select(
            `
                id,
                students (
                    first_name,
                    last_name
                )  
            `,
        )
        .eq("lia_class_id", liaClass?.id ?? "")
        .or("status.is.null,status.neq.removed")
        .order("enrolled_at", { ascending: false })
    
    const selectedEnrollment = (enrollments ?? []).find(
        (enrollment) => enrollment.id === query.student,
    );

    const selectedStudentRecord = selectedEnrollment
        ? Array.isArray(selectedEnrollment.students)
            ? selectedEnrollment.students[0]
            : selectedEnrollment.students
        : null;
    
    const selectedStudentName = selectedStudentRecord
        ? `${selectedStudentRecord.first_name ?? ""} ${
            selectedStudentRecord.last_name ?? ""
        }`.trim()
        : "";
    
    const { data: studentLogs} =
        liaClass && selectedEnrollment 
            ? await supabase
                .from("tutoring_logs")
                .select('activity_type, duration_minutes, status')
                .eq("lia_class_id", liaClass.id)
                .eq("student_enrollment_id", selectedEnrollment.id)
            : { data: [] };
        
    const approvedLogs = (studentLogs ?? []).filter(
        (log) => log.status === "approved",
    );

    const pendingLogs = (studentLogs ?? []).filter(
        (log) => log.status === "pending" || log.status === null,
    );

    const tutoringMinutes = approvedLogs
        .filter((log) => log.activity_type === "tutoring")
        .reduce((total, log) => total + Number(log.duration_minutes ?? 0), 0);
    
    const serviceMinutes = approvedLogs
        .filter((log) => log.activity_type === "service")
        .reduce((total, log) => total + Number(log.duration_minutes ?? 0), 0);
    
    const pendingMinutes = pendingLogs.reduce(
        (total, log) => total + Number(log.duration_minutes ?? 0),
        0,
    );

    function formatHours(minutes: number) {
        const hours = minutes / 60;

        return new Intl.NumberFormat("en-US", {
            maximumFractionDigits: 2,
        }).format(hours);
    }

    const submitLog = submitTutoringLog.bind(null, token);

    return (
        <main className="min-h-screen bg-[#fbf6f6] px-4 py-8">
            <section className="mx-auto max-w-2xl rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Latinos In Action
                </p>

                <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
                    Tutoring Timesheet and Daily Log
                </h1>

                <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Submit your tutoring or service session for teacher approval.
                </p>

                {liaClass ? (
                    <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                        <p className="font-semibold text-zinc-900">
                            {liaClass.name}
                        </p>
                        <p>
                            {school?.name ?? "School"} · {liaClass.school_year}
                            {liaClass.period ? ` · ${liaClass.period}` : ""}
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-[#c4122f]">
                        This class form could not be found.
                    </div>
                )}

                {query.submitted === "true" && (
                    <div className="mt-5 rounded-md border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                        Your log was submitted. Your teacher will review it before it counts toward your hours.
                    </div>
                )}

                {query.error && (
                    <div
                        id="tutoring-form-error"
                        tabIndex={-1}
                        className="mt-5 scroll-mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-[#c4122f] outline-none focus:ring-2 focus:ring-red-300"
                    >
                        {query.error === "invalid-time"
                            ? "Departure time must be after arrival time."
                            : query.error === "missing-student"
                                ? "Please choose your name from the roster."
                                : query.error === "missing-proof"
                                    ? "Please upload proof of this tutoring or service session."
                                    : query.error === "invalid-proof-type"
                                        ? "Please upload a JPG, PNG, WebP, HEIC, PDF, DOC, or DOCX file."
                                        : query.error === "proof-too-large"
                                            ? "The proof file must be 8 MB or smaller."
                                            : query.error === "proof-upload-failed"
                                                ? "The proof file could not be uploaded. Please try again."
                                                : query.error === "duplicate-log"
                                                    ? "This session has already been submitted. Please do not submit it again."
                                                    : "Something went wrong. Please try again."}

                        {query.error !== "duplicate-log" ? (
                            <span className="mt-2 block font-normal text-red-700">
                                Your other answers were restored. For security,
                                please select the proof file again before submitting.
                            </span>
                        ) : null}
                    </div>
                )}
                
                {liaClass && !selectedEnrollment ? (
                    <form
                        action={`/tutoring/${encodeURIComponent(token)}`}
                        method="get"
                        className="mt-8 space-y-5"
                    >
                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Select your name
                            </span>

                            <select
                                name="student"
                                required
                                className={fieldClasses}
                            >
                                <option value="">Choose your name</option>

                                {(enrollments ?? []).map((enrollment) => {
                                    const student = Array.isArray(enrollment.students)
                                        ? enrollment.students[0]
                                        : enrollment.students;
                                    
                                    return (
                                        <option
                                            key={enrollment.id}
                                            value={enrollment.id}
                                        >
                                            {student?.first_name} {student?.last_name}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

                        <button
                            type="submit"
                            className="w-full rounded-md bg-[#c4122f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a70d25]"
                        >
                            Continue
                            </button>
                    </form>
                ): null}

                {liaClass && selectedEnrollment && !query.view ? (
                    <section className="mt-8">
                        <div className="rounded-md border border-red-100 bg-red-50 p-5">
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                                Student
                            </p>

                            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
                                {selectedStudentName}
                            </h2>

                            <p className="mt-1 text-sm text-zinc-600">
                                What would you like to do?
                            </p>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <Link
                                href={`/tutoring/${encodeURIComponent(
                                    token,
                                )}?student=${encodeURIComponent(
                                    selectedEnrollment.id,
                                )}&view=hours`}
                                className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-red-200 hoevr:bg-red-50"
                            >
                                <p className="text-lg font-semibold text-zinc-950">
                                    View My Hours
                                </p>
                                <p className="mt-1 text-sm text-zinc-600">
                                    See your approved tutoring and service hours.
                                </p>
                            </Link>

                            <Link
                                href={`/tutoring/${encodeURIComponent(
                                    token,
                                )}?student=${encodeURIComponent(
                                    selectedEnrollment.id,
                                )}&view=submit`}
                                className="rounded-xl bg-[#c4122f] p-5 text-white transition hover:bg-[#a70d25]"
                            >
                                <p className="text-lg font-semibold">
                                    Submit a Log
                                </p>
                                <p className="mt-1 text-sm text-white/80">
                                    Record a new tutoring or service session.
                                </p>
                            </Link>
                        </div>

                        <Link
                            href={`/tutoring/${encodeURIComponent(token)}`}
                            className="mt-5 inline-flex text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
                        >
                            Choose a different student
                        </Link>
                    </section>
                ) : null}

                {liaClass && selectedEnrollment && query.view === "hours" ? (
                    <section className="mt-8">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                            Hours for
                        </p>

                        <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
                            {selectedStudentName}
                        </h2>

                        <div className="mt-5 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                                <p className="text-sm font-semibold text-blue-700">
                                    Tutoring
                                </p>
                                <p className="mt-2 text-3xl font-bold text-blue-950">
                                    {formatHours(tutoringMinutes)}
                                </p>
                                <p className="text-sm text-blue-700">approved hours</p>
                            </div>

                            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                                <p className="text-sm font-semibold text-green-700">
                                    Service
                                </p>
                                <p className="mt-2 text-3xl font-bold text-green-950">
                                    {formatHours(serviceMinutes)}
                                </p>
                                <p className="text-sm text-green-700">approved hours</p>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                                <p className="text-sm font-semibold text-amber-700">
                                    Pending
                                </p>
                                <p className="mt-2 text-3xl font-bold text-amber-950">
                                    {formatHours(pendingMinutes)}
                                </p>
                                <p className="text-sm text-amber-700">
                                    awaiting approval
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href={`/tutoring/${encodeURIComponent(
                                    token,
                                )}?student=${encodeURIComponent(
                                    selectedEnrollment.id,
                                )}&view=submit`}
                                className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#c4122f] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                            >
                                Submit a Log
                            </Link>
                        </div>
                    </section>
                ) : null}

                {liaClass && selectedEnrollment && query.view === "submit" ? (
                    <form
                        action={submitLog}
                        data-tutoring-form
                        className="mt-8 space-y-5"
                    >
                        <TutoringFormPersistence
                            token={token}
                            submitted={query.submitted === "true"}
                            hasError={Boolean(query.error)}
                        />
                        <input
                            type="hidden"
                            name="studentEnrollmentId"
                            value={selectedEnrollment.id}
                        />

                        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Submitting as
                            </p>
                            <p className="mt-1 font-semibold text-zinc-950">
                                {selectedStudentName}
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    School Site
                                </span>
                                <input
                                    name="schoolSite"
                                    defaultValue={school?.name ?? ""}
                                    className={fieldClasses}
                                />
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    Class Period
                                </span>
                                <input
                                    name="classPeriod"
                                    defaultValue={liaClass.period ?? ""}
                                    className={fieldClasses}
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Activity Type
                            </span>
                            <select
                                name="activityType"
                                required
                                className={fieldClasses}
                            >
                                <option value="tutoring">Tutoring</option>
                                <option value="service">Service</option>
                            </select>
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Date
                            </span>
                            <input
                                type="date"
                                name="sessionDate"
                                required
                                className={fieldClasses}
                            />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    Arrival Time
                                </span>
                                <input
                                    type="time"
                                    name="arrivalTime"
                                    required
                                    className={fieldClasses}
                                />
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    Departure Time
                                </span>
                                <input
                                    type="time"
                                    name="departureTime"
                                    required
                                    className={fieldClasses}
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Mentor&apos;s Initials
                            </span>
                            <input
                                name="mentorInitials"
                                className={fieldClasses}
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Major Activities
                            </span>
                            <textarea
                                name="majorActivities"
                                rows={4}
                                required
                                className={fieldClasses}
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Comments
                            </span>
                            <textarea
                                name="comments"
                                rows={3}
                                className={fieldClasses}
                            />
                        </label>

                        <div className="border-t border-zinc-200 pt-5">
                            <h2 className="text-lg font-semibold text-zinc-900">
                                Mentee Information
                            </h2>

                            <div className="mt-4 space-y-5">
                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-800">
                                        Elementary Mentee
                                    </span>
                                    <input
                                        name="elementaryMenteeName"
                                        className={fieldClasses}
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-800">
                                        Mentee&apos;s Grade in School
                                    </span>
                                    <input
                                        name="menteeGrade"
                                        className={fieldClasses}
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-800">
                                        English Language Proficiency
                                    </span>
                                    <select
                                        name="englishLanguageProficiency"
                                        className={fieldClasses}
                                    >
                                        <option value="">Select one</option>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-800">
                                        Cooperating Elementary Teacher
                                    </span>
                                    <input
                                        name="cooperatingElementaryTeacher"
                                        className={fieldClasses}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="border-t border-zinc-200 pt-5">
                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    Proof of Tutoring or Service
                                    <span className="ml-1 text-[#c4122f]">*</span>
                                </span>

                                <span className="mt-1 block text-sm leading-5 text-zinc-600">
                                    Upload a photo, PDF, or Word document, that verifies this
                                    tutoring or service session.
                                </span>

                                <input
                                    type="file"
                                    name="proofFile"
                                    required
                                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.doc,.docx"
                                    className={`${fieldClasses} file:mr-4 file:rounded-md file:border-0 file:bg-red-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#c4122f] hover:file:bg-red-100`}
                                />

                                <span className="mt-2 block text-xs text-zinc-500">
                                    Accepted formats: JPG, PNG, WebP, HEIC, PDF, DOC, or DOCX.
                                    Maximum file size: 8 MB.
                                </span>
                            </label>
                        </div>

                        <SubmitTutoringLogButton />
                    </form>
                ) : null}
            </section>
        </main>
    );
}

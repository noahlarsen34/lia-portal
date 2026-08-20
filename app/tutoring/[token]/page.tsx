import { createAdminClient } from "@/utils/supabase/admin";
import { submitTutoringLog } from './actions';
import {
    SubmitTutoringLogButton,
    TutoringFormPersistence,
} from "./form-safety";

type StudentTutoringFormPageProps = {
    params: Promise<{
        token: string;
    }>;
    searchParams: Promise<{
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

                {liaClass && (
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
                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Name
                            </span>
                            <select
                                name="studentEnrollmentId"
                                required
                                className={fieldClasses}
                            >
                                <option value="">Select your name</option>
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
                )}
            </section>
        </main>
    );
}

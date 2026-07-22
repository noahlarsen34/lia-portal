import { createClient } from "@/utils/supabase/server";
import { submitTutoringLog } from './actions';

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
    const supabase = await createClient();

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
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-[#c4122f]">
                        {query.error === "invalid-time"
                            ? "Departure time must be after arrival time."
                            : query.error === "missing-student"
                                ? "Please choose your name from the roster."
                                : "Something went wrong. Please try again."}
                    </div>
                )}

                {liaClass && (
                    <form action={submitLog} className="mt-8 space-y-5">
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

                        <button
                            type="submit"
                            className="rounded-md bg-[#c4122f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a70d25]"
                        >
                            Submit Log
                        </button>
                    </form>
                )}
            </section>
        </main>
    );
}

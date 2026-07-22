import { createAdminClient } from "@/utils/supabase/admin";
import { submitMicrocredential } from "./actions";

type PageProps = {
    params: Promise<{ token: string }>;
    searchParams: Promise<{
        submitted?: string;
        error?: string;
    }>;
};

const fieldClasses =
    "mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100";

const errorMessages: Record<string, string> = {
    "class-not-found": "This class form could not be found.",
    "missing-student": "Select your name from the class roster.",
    "invalid-credential": "Select a valid microcredential.",
    "missing-file": "Choose a document to upload.",
    "invalid-file": "Upload a PDF, Word document, JPG, or PNG under 10 MB.",
    "upload-failed": "The document could not be uploaded.",
    "submission-failed": "The submission could not be saved.",
};

export default async function MicrocredentialFormPage({
    params,
    searchParams,
}: PageProps) {
    const { token } = await params;
    const query = await searchParams;
    const supabase = createAdminClient();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name, period, school_year, schools(name)")
        .eq("application_token", token)
        .maybeSingle();
    
    const { data: enrollments } = liaClass
        ? await supabase
            .from("lia_class_students")
            .select("id, students(first_name, last_name)")
            .eq("lia_class_id", liaClass.id)
            .or("status.is.null,status.neq.removed")
            .order("enrolled_at")
        : {data: []};
    
    const school = Array.isArray(liaClass?.schools)
        ? liaClass.schools[0]
        : liaClass?.schools;
    
    const submitAction = submitMicrocredential.bind(null, token);

    return (
        <main className="min-h-screen bg-[#fbf6f6] px-4 py-8">
            <section className="mx-auto max-w-2xl rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase text-[#c4122f]">
                    Latinos In Action
                </p>

                <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
                    Microcredential Document Submission
                </h1>

                <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Upload your document for teacher review.
                </p>

                {liaClass ? (
                    <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                        <p className="font-semibold text-zinc-950">{liaClass.name}</p>
                        <p className="mt-1 text-sm text-zinc-600">
                            {school?.name ?? "School"} · {liaClass.school_year}
                            {liaClass.period ? ` · ${liaClass.period}` : ""}
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        This class form could not be found.
                    </div>
                )}

                {query.submitted === "true" ? (
                    <div className="mt-5 rounded-md border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                        Your document was submitted for teacher review.
                    </div>
                ) : null}

                {query.error ? (
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {errorMessages[query.error] ?? "Something went wrong. Try again."}
                    </div>
                ) : null}

                {liaClass ? (
                    <form action={submitAction} className="mt-8 space-y-5">
                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">Name</span>
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
                                        <option key={enrollment.id} value={enrollment.id}>
                                            {student?.first_name} {student?.last_name}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">
                Assignment or Microcredential Name
              </span>
              <input
                type="text"
                name="credentialType"
                required
                maxLength={150}
                placeholder="Enter the assignment or microcredential name"
                className={fieldClasses}
              />
            </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Document
                            </span>
                            <input
                                type="file"
                                name="file"
                                required
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                className={fieldClasses}
                            />
                            <span className="mt-2 block text-xs text-zinc-500">
                                PDF, Word, JPG, or PNG. Maximum size: 10 MB.
                            </span>
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-800">
                                Note to your teacher
                            </span>
                            <textarea
                                name="studentNote"
                                rows={4}
                                className={fieldClasses}
                            />
                        </label>

                        <button
                            type="submit"
                            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#c4122f] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Submit Document
                        </button>
                    </form>
                ) : null}
            </section>
        </main>
    );
}

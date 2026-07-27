import { requireTeacher } from "@/utils/role-guards";
import { newTeacherQuizQuestions } from "@/utils/new-teacher-quiz";
import { submitNewTeacherQuiz } from "./actions";

type NewTeacherCompletionQuizPageProps = {
    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function NewTeacherCompletionQuizPage({
    searchParams,
}: NewTeacherCompletionQuizPageProps) {
    const params = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: teacher } = await supabase
        .from("teachers")
        .select(
            `
                id,
                first_name,
                last_name,
                email,
                schools (
                    name,
                    state,
                    districts (
                        name
                    )  
                ) 
            `,
        )
        .eq("profile_id", profile.id)
        .maybeSingle();
    
    const school = Array.isArray(teacher?.schools)
        ? teacher.schools[0]
        : teacher?.schools;
    
    const district = Array.isArray(school?.districts)
        ? school.districts[0]
        : school?.districts;
    const certificateTestEmail =
        process.env.NODE_ENV !== "production"
            ? process.env.NEW_TEACHER_CERTIFICATE_TEST_EMAIL?.trim()
            : undefined;
    
    return (
        <div className="mx-auto max-w-4xl">
            <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Teacher Modules
                </p>
                <h1 className="mt-2 text-3xl font-semibold">
                    New Teacher Training Quiz
                </h1>

                <div className="mt-6 rounded-md border-l-4 border-[#c4122f] bg-zinc-50 p-5">
                    <h2 className="text-base font-semibold text-zinc-900">
                        Completing as
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">
                        {teacher?.first_name} {teacher?.last_name}
                        <br />
                        {teacher?.email ?? profile.email}
                        <br />
                        {school?.name ?? "School not linked"}
                        {district?.name ? `, ${district.name}` : ""}
                        {school?.state ? `, ${school.state}` : ""}
                    </p>
                    {certificateTestEmail && (
                        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                            <span className="font-semibold">Test delivery:</span>{" "}
                            Certificate emails will be sent to {certificateTestEmail}.
                        </div>
                    )}
                </div>

                {params.error === "submission-failed" && (
                    <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-[#c4122f]">
                        Something went wrong submitting the quiz. Please try again.
                    </div>
                )}

                <form action={submitNewTeacherQuiz} className="mt-8 space-y-8">
                    {newTeacherQuizQuestions.map((question, index) => (
                        <fieldset key={question.id} className="border-t border-zinc-200 pt-6">
                            <legend className="text-xl font-semibold text-zinc-950">
                                {index + 1}. {question.prompt}
                            </legend>

                            <div className="mt-4 space-y-3">
                                {question.options.map((option) => (
                                    <label
                                        key={option.id}
                                        className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 hover:border-red-200 hover:bg-red-50"
                                    >
                                        <input
                                            type="radio"
                                            name={question.id}
                                            value={option.id}
                                            required
                                            className="h-4 w-4"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ))}

                    <button
                        type="submit"
                        className="inline-flex rounded-md bg-[#c4122f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a70d25]"
                    >
                        Submit Quiz
                    </button>
                </form>
            </section>
        </div>
    );
}

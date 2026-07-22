import Link from "next/link";
import { requireTeacher } from "@/utils/role-guards";
import { getNewTeacherQuizPassingScore } from "@/utils/new-teacher-quiz";

type CompletionPageProps = {
    searchParams: Promise<{
        score?: string;
        total?: string;
        passing?: string;
        passed?: string;
    }>;
};

export default async function NewTeacherQuizCompletePage({
    searchParams,
}: CompletionPageProps) {
    await requireTeacher();

    const params = await searchParams;
    const score = Number(params.score ?? 0);
    const total = Number(params.total ?? 0);
    const passingScore = Number(
        params.passing ?? getNewTeacherQuizPassingScore(total),
    );
    const passed = params.passed
        ? params.passed === "true"
        : total > 0 && score >= passingScore;

    return (
        <div className="mx-auto max-w-4xl">
            <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Teacher Modules
                </p>

                <h1 className="mt-2 text-3xl font-semibold">
                    Quiz Complete
                </h1>

                <div
                    className={`mt-6 rounded-md border-l-4 p-5 ${
                        passed
                            ? "border-green-600 bg-green-50"
                            : "border-[#c4122f] bg-red-50"
                    }`}
                >
                    <h2 className="text-lg font-semibold text-zinc-900">
                        {passed ? "Congratulations, you passed!" : "You did not pass yet"}
                    </h2>

                    <p className="mt-2 text-base leading-7 text-zinc-700">
                        You scored {score} out of {total}. A passing score is{" "}
                        {passingScore} out of {total}, or 80%.
                    </p>

                    {passed ? (
                        <p className="mt-2 text-base leading-7 text-zinc-700">
                            Your completion has been recorded. Once email certificates are connected,
                            your personalized certificate will be sent automatically.
                        </p>
                    ) : (
                        <p className="mt-2 text-base leading-7 text-zinc-700">
                            Please review the modules and retake the quiz. Your attempt was saved,
                            but you will need to score 80% or higher to complete the training.
                        </p>
                    )}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                        href="/teacher/modules"
                        className="inline-flex rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c4122f] shadow-sm transition hover:bg-red-50"
                    >
                        Back to Teacher Modules
                    </Link>

                    {!passed && (
                        <Link
                            href="/teacher/modules/completion-quiz"
                            className="inline-flex rounded-md bg-[#c4122f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a70d25]"
                        >
                            Retake Quiz
                        </Link>
                    )}
                </div>
            </section>
        </div>
    );
}

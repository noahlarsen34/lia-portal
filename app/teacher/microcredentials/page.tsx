import Link from "next/link";
import { Award, ExternalLink } from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";

export default async function TeacherMicrocredentialsPage() {
    const { supabase, profile } = await requireTeacher();

    const { data: classes } = await supabase
        .from("lia_classes")
        .select("id, name, period, school_year, status, application_token")
        .eq("teacher_profile_id", profile.id)
        .order("name");

    return (
        <div className="mx-auto max-w-7xl">
            <header className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-semibold uppercase text-[#c4122f]">
                    Microcredentials
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
                    Student Document Submissions
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Choose a class to open its student submission form.
                </p>
            </header>

            {classes && classes.length > 0 ? (
                <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {classes.map((liaClass) => (
                        <article
                            key={liaClass.id}
                            className="flex flex-col rounded-md border border-red-100 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-[#c4122f]">
                                    <Award className="h-5 w-5" aria-hidden />
                                </div>
                                <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold capitalize text-zinc-600">
                                    {liaClass.status}
                                </span>
                            </div>

                            <h2 className="mt-4 text-lg font-semibold text-zinc-950">
                                {liaClass.name}
                            </h2>
                            <p className="mt-2 text-sm text-zinc-600">
                                {liaClass.school_year}
                                {liaClass.period ? ` · ${liaClass.period}` : ""}
                            </p>

                            <Link
                                href={`/teacher/classes/${liaClass.id}/microcredentials`}
                                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-[#c4122f] transition hover:bg-red-50"
                            >
                                Review Submissions
                                <ExternalLink className="h-4 w-4" aria-hidden />
                            </Link>
                        </article>
                    ))}
                </section>
            ) : (
                <div className="mt-5 rounded-md border border-dashed border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500">
                    No classes are available yet.
                </div>
            )}
        </div>
    );
}

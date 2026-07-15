import { ExternalLink } from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import { curriculumSections } from "@/utils/curriculum-links";

export default async function TeacherResourcesPage() {
    await requireTeacher();

    return (
        <div className="mx-auto max-w-7xl">
            <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Curriculum
                </p>
                <h1 className="mt-2 text-3xl font-semibold">LIA Curriculum</h1>
                <p className="mt-1 text-sm text-zinc-600">
                    Open LIA curriculum resources from the existing curriculum site.
                </p>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {curriculumSections.map((section) => (
                    <a
                        key={section.title}
                        href={section.href}
                        target='_blank'
                        rel="noreferrer"
                        className="rounded-md border border-red-100 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-950">
                                    {section.title}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-zinc-600">
                                    {section.description}
                                </p>
                            </div>

                            <ExternalLink
                                className="h-5 w-5 shrink-0 text-[#c4122f]"
                                aria-hidden
                            />
                        </div>
                    </a>
                ))}
            </section>
        </div>
    );
}
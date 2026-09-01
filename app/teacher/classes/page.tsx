import Link from "next/link";
import { requireTeacher } from "@/utils/role-guards";

export default async function TeacherClassesPage() {
    const { supabase, profile } = await requireTeacher();

    const { data: teacher } = await supabase
        .from("teachers")
        .select(
            `
                id,
                school_id,
                first_name,
                last_name,
                name
            `,
        )
        .eq("profile_id", profile.id)
        .maybeSingle();
    
    if (!teacher) {
        return (
            <div className="mx-auto max-w-4xl">
                <header className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                        My Classes
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold">Classes</h1>
                </header>

                <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-zinc-950">
                        Teacher account not linked
                    </h2>
                    <p className="mt-2 text-zinc-600">
                        Your login account is not connected to a teacher record yet. Please
                        ask an administrator to link your profile to your school teacher record.
                    </p>
                </section>
            </div>
        );
    }

    const { data: school } = await supabase
        .from("schools")
        .select("id, name")
        .eq("id", teacher.school_id)
        .maybeSingle();

    const { data: classes, error } = await supabase
        .from("lia_classes")
        .select(
            `
                id,
                name,
                school_year,
                period,
                grade_level,
                status,
                updated_at
            `,
        )
        .eq("teacher_profile_id", profile.id)
        .order("updated_at", { ascending: false });
    
    return (
        <div className="mx-auto max-w-6xl">
            <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                        My Classes
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold">Classes</h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        Manage your LIA classes for {school?.name ?? "your school"}.
                    </p>
                </div>

                <Link
                    href="/teacher/classes/new"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white transition hover:bg-[#a70d25]">
                        Add Class
                    </Link>
            </header>

            {error ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Could not load classes: {error.message}
                </div>
            ) : null}

            {!error && (!classes || classes.length  == 0) ? (
                <section className="rounded-md border border-red-100 bg-white p-8 text-center shadow-sm">
                    <h2 className="text-xl font-semibold text-zinc-950">
                        No classes yet.
                    </h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600">
                        Create your first LIA class so you can start managing students and 
                        program activity.
                    </p>
                    <Link
                        href="/teacher/classes/new"
                        className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white transition hover:bg-[#a70d25]"
                    >
                        Add Class
                    </Link>
                </section>
            ) : null}

            {classes && classes.length > 0 ? (
                <section className="overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Class</th>
                                    <th className="px-4 py-3">School Year</th>
                                    <th className="px-4 py-3">Period</th>
                                    <th className="px-4 py-3">Grade</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {classes.map((liaClass) => (
                                    <tr key={liaClass.id}>
                                        <td className="px-4 py-4 font-semibold">
                                            <Link
                                                href={`/teacher/classes/${liaClass.id}`}
                                                prefetch={false}
                                                className="text-zinc-950 transition hover:text-[#c4122f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4122f]"
                                            >
                                                {liaClass.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4 text-zinc-700">
                                            {liaClass.school_year}
                                        </td>
                                        <td className="px-4 py-4 text-zinc-700">
                                            {liaClass.period || "N/A"}
                                        </td>
                                        <td className="px-4 py-4 text-zinc-700">
                                            {liaClass.grade_level || "N/A"}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700">
                                                {liaClass.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <Link
                                                href={`/teacher/classes/${liaClass.id}`}
                                                prefetch={false}
                                                className="font-semibold text-[#c4122f] hover:text-[#a70d25]"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}
        </div>
    );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { updateLiaClass } from "./actions";

type EditTeacherClassPageProps = {
    params: Promise<{
        classId: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function EditTeacherClassPage({
    params,
    searchParams,
}: EditTeacherClassPageProps) {
    const { classId } = await params;
    const { error } = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select(
            `
                id,
                name,
                school_year,
                period,
                grade_level,
                status,
                notes,
                teacher_profile_id
            `,
        )
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass) {
        notFound();
    }

    const updateClassById = updateLiaClass.bind(null, liaClass.id);

    return (
        <div className="mx-auto max-w-3xl">
            <Link
                href={`/teacher/classes/${liaClass.id}`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to class
            </Link>

            <section className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                        Edit Class
                    </p>
                    <h1 className="mt-2 break-words text-3xl font-semibold [overflow-wrap:anywhere]">
                        {liaClass.name}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        Update class details for your LIA class.
                    </p>
                </div>

                {error ? (
                    <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error === "missing-fields"
                            ? "Class name and school year are required."
                            : "Something went wrong. Please try again."
                        } 
                    </div>
                ) : null} 

                <form action={updateClassById} className="space-y-5">
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-800">
                            Class Name
                        </span>
                        <input
                            name="name"
                            required
                            defaultValue={liaClass.name}
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                        />
                    </label>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                School Year
                            </span>
                            <input
                                name="school_year"
                                required
                                defaultValue={liaClass.school_year}
                                placeholder="2026-2027"
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Period / Section
                            </span>
                            <input
                                name="period"
                                defaultValue={liaClass.period ?? ""}
                                placeholder="Period 1"
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            />
                        </label>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Grade Level
                            </span>
                            <input
                                name="grade_level"
                                defaultValue={liaClass.grade_level ?? ""}
                                placeholder="9-12"
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Status
                            </span>
                            <select
                                name="status"
                                defaultValue={liaClass.status}
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </label>
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium text-zinc-800">
                            Notes
                        </span>
                        <textarea
                            name="notes"
                            rows={4}
                            defaultValue={liaClass.notes ?? ""}
                            placeholder="Optional notes about this class"
                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                        />
                    </label>

                    <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                        <Link
                            href={`/teacher/classes/${liaClass.id}`}
                            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c4122f] sm:w-auto"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

import { createAdminClient } from "@/utils/supabase/admin";
import { IntermountainAssignmentForm } from "./intermountain-assignment-form";

type PageProps = {
    params: Promise<{ token: string }>;
};

export default async function MicrocredentialFormPage({
    params,
}: PageProps) {
    const { token } = await params;
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

    const enrollmentOptions = (enrollments ?? []).flatMap(
        (enrollment) => {
            const student = Array.isArray(enrollment.students)
                ? enrollment.students[0]
                : enrollment.students;
            const name = [student?.first_name, student?.last_name]
                .filter(Boolean)
                .join(" ")
                .trim();

            return name
                ? [{ id: enrollment.id, name }]
                : [];
        },
    );
    
    return (
        <main className="min-h-screen bg-[#fbf6f6] px-4 py-8">
            <section className="mx-auto max-w-4xl rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase text-[#c4122f]">
                    Latinos In Action
                </p>

                <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
                    Intermountain Health: Emotional Well-Being
                </h1>

                <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Complete the standardized training reflection and submit
                    your evidence for teacher review.
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

                {liaClass ? (
                    <div className="mt-8">
                        <IntermountainAssignmentForm
                            token={token}
                            enrollments={enrollmentOptions}
                        />
                    </div>
                ) : null}
            </section>
        </main>
    );
}

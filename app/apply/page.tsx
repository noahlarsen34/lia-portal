import { redirect } from "next/navigation";
import { createApplicationClient } from "./application-client";

type ApplyPageProps = {
    searchParams: Promise<{
        state?: string;
        schoolId?: string;
        teacherId?: string;
        classId?: string;
        error?: string;
    }>;
};

async function startApplication(formData: FormData) {
    "use server";

    const classId = String(formData.get("class_id") ?? "").trim();

    if (!classId) {
        redirect("/apply?error=missing-class");
    }

    const supabase = createApplicationClient();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("application_token, applications_open")
        .eq("id", classId)
        .maybeSingle();
    
    if (!liaClass || !liaClass.applications_open) {
        redirect("/apply?error=closed");
    }

    redirect(`/apply/${liaClass.application_token}`);
}   

export default async function ApplyPage({ searchParams }: ApplyPageProps) {
    const { state, schoolId, teacherId, error } = await searchParams;
    const supabase = createApplicationClient();

    const { data: stateRows } = await supabase
        .from("schools")
        .select("state")
        .not("state", "is", null)
        .neq("state", "")
        .order("state", {ascending: true});
    
    const states = Array.from(
        new Set(
            (stateRows ?? [])
                .map((school) => school.state)
                .filter(Boolean),
        ),
    );

    const { data: schools } = state
        ? await supabase
            .from("schools")
            .select("id, name, state")
            .eq("state", state)
            .order("name", {ascending: true})
        : {data: []};
    
    const { data: teachers } = schoolId
        ? await supabase
            .from("teachers")
            .select("id, name, first_name, last_name, profile_id")
            .eq("school_id", schoolId)
            .eq("status", "active")
            .order("name", {ascending:true})
        : { data: [] };

    const selectedTeacher = teachers?.find((teacher) => teacher.id === teacherId);
    const selectedTeacherProfileId = selectedTeacher?.profile_id ?? null;

    const { data: classes } = selectedTeacherProfileId
        ? await supabase
            .from("lia_classes")
            .select("id, name, school_year, period, grade_level, application_token")
            .eq("teacher_profile_id", selectedTeacherProfileId)
            .eq("school_id", schoolId)
            .eq("status", "active")
            .eq("applications_open", true)
            .order("name", {ascending:true})
        : {data: []};
    
    return (
        <main className="min-h-screen bg-[#f8f4f4] px-4 py-10 text-zinc-950">
            <section className="mx-auto max-w-3xl rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Latinos In Action
                </p>
                <h1 className="mt-2 text-3xl font-semibold">Student Application</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Select your state, school, teacher, and class to begin your LIA application.
                </p>

                {error ? (
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error === "missing-class"
                            ? "Please select a class before continuing."
                            : error === "closed"
                                ? "That application is currently closed."
                                : "Something went wrong. Please try again."}
                    </div>
                ) : null}

                <div className="mt-6 space-y-5">
                    <form action="/apply" className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">State</span>
                            <select
                                name="state"
                                defaultValue={state ?? ""}
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                            >
                                <option value="">Select a state</option>
                                {states.map((stateName) => (
                                    <option key={stateName} value={stateName}>
                                        {stateName}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="h-11 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c4122f]"
                            >
                                Find Schools
                            </button>
                        </div>
                    </form>

                    <form action="/apply" className="grid gap-5 sm:grid-cols-2">
                            <input type="hidden" name="state" value={state ?? ""} />

                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">School</span>
                                <select
                                    name="schoolId"
                                    defaultValue={schoolId ?? ""}
                                    disabled={!state}
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100 disabled:bg-zinc-100"
                                >
                                    <option value="">Select a school</option>
                                    {(schools ?? []).map((school) => (
                                        <option key={school.id} value={school.id}>
                                            {school.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={!state}
                                    className="h-11 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c4122f] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                                >
                                    Find Teachers
                                </button>
                            </div>
                    </form>

                    <form action='/apply' className="grid gap-5 sm:grid-cols-2">
                            <input type="hidden" name="state" value={state ?? ""} />
                            <input type="hidden" name="schoolId" value={schoolId ?? ""} />

                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">Teacher</span>
                                <select
                                    name="teacherId"
                                    defaultValue={teacherId ?? ""}
                                    disabled={!schoolId}
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100 disabled:bg-zinc-100"
                                >
                                    <option value="">Select a teacher</option>
                                    {(teachers ?? []).map((teacher) => {
                                        const teacherName =
                                            `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
                                            teacher.name ||
                                            "Unnamed Teacher";
                                        
                                        return (
                                            <option key={teacher.id} value={teacher.id}>
                                                {teacherName}
                                            </option>
                                        );
                                    })}
                                </select>
                            </label>

                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={!schoolId}
                                    className="h-11 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c4122f] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                                >
                                    Find Classes
                                </button>
                            </div>
                    </form>

                    <form action={startApplication} className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">Class</span>
                            <select
                                name="class_id"
                                defaultValue=""
                                disabled={!teacherId}
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100 disabled:bg-zinc-100"
                            >
                                <option value="">Select a class</option>
                                {(classes ?? []).map((liaClass) => (
                                    <option key={liaClass.id} value={liaClass.id}>
                                        {liaClass.name}
                                        {liaClass.period ? `- ${liaClass.period}` : ""}
                                        {liaClass.school_year ? ` (${liaClass.school_year})` : ""}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={!teacherId}
                                className="h-11 w-full rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:bg-zinc-300"
                            >
                                Start Application
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}

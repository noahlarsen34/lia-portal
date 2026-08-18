import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { submitEventRegistration } from "./actions";

type PageProps = {
    params: Promise<{
        registrationToken: string;
    }>;
    searchParams: Promise<{
        submitted?: string;
        error?: string;
    }>;
};

function teacherName(teacher: {
    first_name: string | null;
    last_name: string | null;
    name?: string | null;
}) {
    const combinedName = [
        teacher.first_name,
        teacher.last_name,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();
    
    return combinedName || teacher.name || "Teacher";
}

export default async function EventRegistrationPage({
    params,
    searchParams,
}: PageProps) {
    const { registrationToken } = await params;
    const query = await searchParams;

    const supabase = createAdminClient();

    const { data: event, error: eventError } = await supabase
        .from("lia_events")
        .select(
            `
                id,
                name,
                description,
                event_date,
                start_time,
                end_time,
                location_name,
                location_address,
                registration_deadline,
                capacity,
                status,
                all_schools
            `
        )
        .eq("registration_token", registrationToken)
        .maybeSingle();
    
    if (eventError || !event) {
        notFound();
    }

    let schoolsQuery = supabase
        .from("schools")
        .select("id, name, state")
        .eq("status", "Active")
        .order("state")
        .order("name");
    
    if (!event.all_schools) {
        const { data: eventSchools } = await supabase
            .from("lia_event_schools")
            .select("school_id")
            .eq("event_id", event.id);
        
        const eligibleSchoolsIds = (eventSchools ?? []).map(
            (row) => row.school_id,
        );

        if (eligibleSchoolsIds.length === 0) {
            schoolsQuery = schoolsQuery.in("id", [
                "00000000-0000-0000-0000-000000000000",
            ]);
        } else {
            schoolsQuery = schoolsQuery.in(
                "id",
                eligibleSchoolsIds,
            );
        }
    }

    const { data: schools, error: schoolsError } =
        await schoolsQuery;
    
    if (schoolsError) {
        throw new Error(
            `Unable to load eligible schools: ${schoolsError.message}`,
        );
    }

    const schoolIds = (schools ?? []).map(
        (school) => school.id,
    );

    const { data: teachers, error: teachersError } =
        schoolIds.length > 0
            ? await supabase
                .from("teachers")
                .select(
                    `
                        id,
                        profile_id,
                        school_id,
                        first_name,
                        last_name,
                        name  
                    `
                )
                .in("school_id", schoolIds)
                .eq("status", "Active")
                .order("last_name")
            : { data: [], error: null};
    
    if (teachersError) {
        throw new Error(
            `Unable to load teachers: ${teachersError.message}`
        );
    }

    const teacherProfileIds = (teachers ?? [])
        .map((teacher) => teacher.profile_id)
        .filter((profileId): profileId is string =>
            Boolean(profileId),
        );
    
    const { data: classes, error: classesError } =
        teacherProfileIds.length > 0
            ? await supabase
                .from("lia_classes")
                .select(
                    `
                        id,
                        name,
                        period,
                        school_id,
                        teacher_profile_id 
                    `
                )
                .in("teacher_profile_id", teacherProfileIds)
                .eq("status", "active")
                .order("name")
            : { data: [], error: null };
    
    if (classesError) {
        throw new Error(
            `Unable to load classes: ${classesError.message}`,
        );
    }

    const schoolNameById = new Map(
        (schools ?? []).map((school) => [
            school.id,
            school.name,
        ]),
    );

    const teacherNamesByProfileId = new Map(
        (teachers ?? [])
            .filter((teacher) => teacher.profile_id)
            .map((teacher) => [
                teacher.profile_id as string,
                teacherName(teacher),
            ]),
    );

    const formAction =
        submitEventRegistration.bind(
            null,
            registrationToken,
        );
    
    if (query.submitted === "true") {
        return (
            <main className="min-h-screen bg-[#fbf7f7] px-4 py-12">
                <section className="mx-auto max-w-3xl rounded-3xl border border-green-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
                        ✓
                    </div>

                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-[#c8102e]">
                        Registration received
                    </p>

                    <h1 className="text-3xl font-bold text-gray-950">
                        You are registered for {event.name}
                    </h1>

                    
                </section>
            </main>
        )
    }


}
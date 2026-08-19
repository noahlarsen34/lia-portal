import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { submitEventRegistration } from "./actions";
import { StudentPicker } from "./student-picker";

type PageProps = {
    params: Promise<{
        registrationToken: string;
    }>;
    searchParams: Promise<{
        submitted?: string;
        error?: string;
        email?: string;
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
                address,
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
        .eq("status", "active")
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
                .eq("status", "active")
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

                    <p className="mx-auto mt-4 max-w-xl text-gray-600">
                        Your registration and competition entry were received
                        successfully. We will send reminders as the event gets
                        closer, followed by your QR-code ticket during the week
                        of the event.
                    </p>

                    {query.email === "sent" ? (
                        <div className="mx-auto mt-6 max-w-xl rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-800">
                            A confirmation email was sent to the email address
                            you provided.
                        </div>
                    ) : null}

                    {query.email === "failed" ? (
                        <div className="mx-auto mt-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
                            Your registration was saved, but the confirmation
                            email could not be delivered. Keep your registration
                            reference and contact your teacher if you need help.
                        </div>
                    ) : null}

                    <Link
                        href={`/event-registration/${registrationToken}`}
                        className="mt-8 inline-flex rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Submit another registration
                    </Link>
                </section>
            </main>
        );
    }

    const unavailable = event.status !== "open";

    return (
        <main className="min-h-screen bg-[#fbf7f7] px-4 py-10">
            <div className="mx-auto max-w-4xl">
                <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#b50926] to-[#e32246] p-8 text-white shadow-lg md:p-12">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/75">
                        Latinos In Action Event
                    </p>

                    <h1 className="mt-3 text-4xl font-bold md:text-5xl">
                        {event.name}
                    </h1>

                    {event.description ? (
                        <p className="mt-4 max-w-2xl text-lg text-white/85">
                            {event.description}
                        </p>
                    ) : null}

                    <div className="mt-7 flex flex-wrap gap-5 text-sm font-medium text-white/90">
                        {event.event_date ? (
                            <span>{event.event_date}</span>
                        ) : null}

                        {event.start_time ? (
                            <span>
                                {event.start_time}
                                {event.end_time
                                    ? ` - ${event.end_time}`
                                    : ""}
                            </span>
                        ) : null}

                        {event.location_name ? (
                            <span>{event.location_name}</span>
                        ) : null}
                    </div>
                </section>
                
                <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 text-gray-950 shadow-sm md:p-10">
                    <div className="mb-8">
                        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#c8102e]">
                            Student registration
                        </p>

                        <h2 className="mt-2 text-3xl font-bold text-gray-950">
                            Register and submit your competition entry
                        </h2>

                        <p className="mt-3 text-gray-600">
                            Complete your information and submit your
                            competition entry as a file or shareable link.
                        </p>
                    </div>

                    {query.error ? (
                        <div className="mb-7 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                            {query.error}
                        </div>
                    ) : null}

                    {unavailable ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
                            Registration for this event is not currently open.
                        </div>
                    ) : (
                        <form
                            action={formAction}
                            className="space-y-8 text-gray-950"
                        >
                            <StudentPicker
                                registrationToken={registrationToken}
                                schools={(schools ?? []).map((school) => ({
                                    id: school.id,
                                    name: school.name,
                                    state: school.state,
                                }))}
                                teachers={(teachers ?? []).map((teacher) => ({
                                    id: teacher.id,
                                    profileId: teacher.profile_id,
                                    schoolId: teacher.school_id,
                                    name: teacherName(teacher),
                                }))}
                                classes={(classes ?? []).map((liaClass) => ({
                                    id: liaClass.id,
                                    name: liaClass.name,
                                    period: liaClass.period,
                                    schoolId: liaClass.school_id,
                                    teacherProfileId: liaClass.teacher_profile_id,
                                }))}
                            />

                            <fieldset disabled className="hidden">
                            <div>
                                <h3 className="mb-4 text-xl font-bold">
                                    Student information
                                </h3>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <label className="space-y-2 font-semibold">
                                        <span>
                                            First name{" "}
                                            <span className="text-[#c8102e]">*</span>
                                        </span>
                                        <input
                                            name="first_name"
                                            required
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none placeholder:text-gray-500 focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="spacey-y-2 font-semibold">
                                        <span>
                                            Last name{" "}
                                            <span className="text-[#c8102e]">*</span>
                                        </span>
                                        <input
                                            name="last_name"
                                            required
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none placeholder:text-gray-500 focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="space-y-2 font-semibold">
                                        <span>
                                            Email{" "}
                                            <span className="text-[#c8102e]">*</span>
                                        </span>
                                        <input
                                            type="email"
                                            name="student_email"
                                            required
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none placeholder:text-gray-500 focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="space-y-2 font-semibold">
                                        <span>Phone</span>
                                        <input
                                            type="tel"
                                            name="phone"
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none placeholder:text-gray-500 focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="space-y-2 font-semibold">
                                        <span>Grade level</span>
                                        <select
                                            name="grade_level"
                                            defaultValue=""
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        >
                                            <option value="">Select grade</option>
                                            {[6, 7, 8, 9, 10, 11, 12].map(
                                                (grade) => (
                                                    <option
                                                        key={grade}
                                                        value={String(grade)}
                                                    >
                                                        Grade {grade}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-8">
                                <h3 className="mb-4 text-xl font-bold">
                                    School and teacher
                                </h3>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <label className="space-y-2 font-semibold">
                                        <span>
                                            School{" "}
                                            <span className="text-[#c8102e]">*</span>
                                        </span>
                                        <select
                                            name="school_id"
                                            required
                                            defaultValue=""
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        >
                                            <option value="" disabled>
                                                Select your school
                                            </option>

                                            {(schools ?? []).map((school) => (
                                                <option
                                                    key={school.id}
                                                    value={school.id}
                                                >
                                                    {school.name}
                                                    {school.state
                                                        ? `- ${school.state}`
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="space-y-2 font-semibold">
                                        <span>
                                            Teacher{" "}
                                            <span className="text-[#c8102e]">*</span>
                                        </span>
                                        <select
                                            name="teacher_id"
                                            required
                                            defaultValue=""
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        >
                                            <option value="" disabled>
                                                Select your teacher
                                            </option>

                                            {(teachers ?? []).map((teacher) => (
                                                <option
                                                    key={teacher.id}
                                                    value={teacher.id}
                                                >
                                                    {teacherName(teacher)} -{" "}
                                                    {schoolNameById.get(
                                                        teacher.school_id,
                                                    ) ?? "School"}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="space-y-2 font-semibold md:col-span-2">
                                        <span>Class or period</span>
                                        <select
                                            name="lia_class_id"
                                            defaultValue=""
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        >
                                            <option value="">
                                                No class selected
                                            </option>

                                            {(classes ?? []).map(
                                                (liaClass) => (
                                                    <option
                                                        key={liaClass.id}
                                                        value={liaClass.id}
                                                    >
                                                        {liaClass.name}
                                                        {liaClass.period
                                                            ? ` - Period ${liaClass.period}`
                                                            : ""}
                                                        {" - "}
                                                        {teacherNamesByProfileId.get(
                                                            liaClass.teacher_profile_id,
                                                        ) ?? "Teacher"}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                </div>
                            </div>
                            </fieldset>

                            <div className="border-t border-gray-200 pt-8">
                                <h3 className="mb-2 text-xl font-bold">
                                    Competition entry
                                </h3>

                                <p className="mb-5 text-gray-600">
                                    Select a category, name your entry, and submit
                                    either a file or a shareable Google Doc,
                                    website, or video link.
                                </p>

                                <div className="space-y-5">
                                    <label className="block space-y-2 font-semibold">
                                        <span>
                                            Competition category{" "}
                                            <span className="text-[#c8102e]">*</span>
                                        </span>
                                        <select
                                            name="competition_category"
                                            required
                                            defaultValue=""
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none placeholder:text-gray-500 focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        >
                                            <option value="" disabled>
                                                Select a competition category
                                            </option>
                                            <option value="Public speaking">
                                                Public speaking
                                            </option>
                                            <option value="Art">Art</option>
                                            <option value="Video">Video</option>
                                            <option value="Essay">Essay</option>
                                        </select>
                                    </label>

                                    <label className="block space-y-2 font-semibold">
                                        <span>
                                            Entry title{" "}
                                            <span className="text-[#c8102e]">*</span>
                                        </span>
                                        <input
                                            name="entry_title"
                                            required
                                            placeholder="Enter the title of your competition entry"
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none placeholder:text-gray-500 focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block space-y-2 font-semibold">
                                        <span>
                                            Google Doc, website, or video link
                                        </span>
                                        <input
                                            type="url"
                                            name="external_url"
                                            placeholder="https://docs.google.com/... or https://youtube.com/..."
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none placeholder:text-gray-500 focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        />
                                        <span className="block text-sm font-normal text-gray-500">
                                            Make sure anyone with the link can view
                                            your Google Doc or Drive file.
                                        </span>
                                    </label>

                                    <label className="block space-y-2 font-semibold">
                                        <span>Upload competition files</span>
                                        <input
                                            type="file"
                                            name="entry_files"
                                            multiple
                                            accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx,.ppt,.pptx,.mp4,.mov"
                                            className="block w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 font-normal text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#c8102e] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#a80d27]"
                                        />
                                        
                                        <span className="block text-sm font-normal text-gray-500">
                                            Up to five files with a combined size below
                                            9 MB. Word documents and PDFs are accepted.
                                            Download a Google Doc as a Word document or
                                            PDF before uploading it, or paste its
                                            shareable link above.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-7">
                                <button
                                    type="submit"
                                    className="w-full rounded-xl bg-[#c8102e] px-6 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-[#a80d27] md:w-auto"
                                >
                                    Submit Registration
                                </button>
                            </div>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}

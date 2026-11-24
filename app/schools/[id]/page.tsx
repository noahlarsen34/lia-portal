import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';
import { Eye } from 'lucide-react';
import {
    getSchoolLifeCycleLabel,
    getSchoolLifeCycleStatus,
} from "@/utils/school-status";
import { 
    deleteActivity,
    deleteContact,
    deleteDocument,
    deleteTeacher,
    updateSchoolProfileNotes,
} from './actions';
import { SchoolProfileNotes } from './school-profile-notes';


type SchoolProfilePageProps = {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        error?: string;
        success?: string;
    }>;
};

export default async function SchoolProfilePage({
    params,
    searchParams,
}: SchoolProfilePageProps) {
    const {id} = await params;
    const { error, success } = await searchParams;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
    
    const isAdmin = profile?.role === "admin";

    const { data: school } = await supabase
        .from("schools")
        .select(`
            id,
            name,
            year_lia_started,
            address:city,
            state,
            region,
            assigned_rpm_id,
            status,
            mou_status,
            mou_signed_date,
            student_count,
            chapter_size,
            last_contact_date,
            notes
            `)
            .eq('id',id)
            .maybeSingle();

        if(!school) {
        redirect('/schools');

    }

    const schoolLifeCycleStatus = getSchoolLifeCycleStatus(
        school.year_lia_started
    );

    const schoolLifeCycleLabel = getSchoolLifeCycleLabel(
        schoolLifeCycleStatus,
    );

    const { data: schoolClassRows } = await supabase
        .from("lia_classes")
        .select("id, name, teacher_profile_id, status")
        .eq("school_id", school.id)
        .order("name", { ascending: true });
    
    const schoolClassIds = schoolClassRows?.map((liaClass) => liaClass.id) ?? [];

    const { data: schoolEnrollmentRows } = schoolClassIds.length > 0
        ? await supabase
            .from("lia_class_students")
            .select("lia_class_id, student_id")
            .in("lia_class_id", schoolClassIds)
            .or("status.is.null,status.neq.removed")
        : { data: [] };

    const { data: schoolServiceRows } = schoolClassIds.length > 0
        ? await supabase
            .from("tutoring_logs")
            .select("lia_class_id, duration_minutes, status")
            .in("lia_class_id", schoolClassIds)
        : { data: [] };
    
    const enrollmentCountByClassId = new Map<string, number>();
    for (const enrollment of schoolEnrollmentRows ?? []) {
        enrollmentCountByClassId.set(
            enrollment.lia_class_id,
            (enrollmentCountByClassId.get(enrollment.lia_class_id) ?? 0) + 1,
        );
    }

    const serviceMinutesByClassId = new Map<string, number>();
    for (const log of schoolServiceRows ?? []) {
        if (log.status === "rejected") {
            continue;
        }

        serviceMinutesByClassId.set(
            log.lia_class_id,
            (serviceMinutesByClassId.get(log.lia_class_id) ?? 0) +
                Number(log.duration_minutes ?? 0),
        );
    }

    const updateNotesForSchool = updateSchoolProfileNotes.bind(null, school.id);

    const { data: assignedRpm } = school.assigned_rpm_id
        ? await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", school.assigned_rpm_id)
            .maybeSingle()
        : { data: null };

    const assignedRpmName = assignedRpm?.full_name ?? "Unassigned";

    const formatProgramLevel = (programLevel: string | null) => {
        switch (programLevel) {
            case 'elementary':
                return "Elementary";
            case "middle":
                return "Middle School";
            case "high":
                return "High School";
            case "middle_high":
                return "Middle + High School";
            case "k_8":
                return "K-8";
            case "k_12":
                return "K-12";
            case "other":
                return "Other";
            case "unknown":
            default:
                return "Unknown";

        }
    };
    
    const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, first_name, last_name, role, email, phone, status, notes")
        .eq("school_id", id)
        .order("role", { ascending: true });
    
    const { data: teachers } = await supabase
        .from("teachers")
        .select("id, profile_id, name, first_name, last_name, email, phone, status, username, program_level, notes, password_status, is_new_teacher, reporting_role")
        .eq("school_id", id)
        .order("name", { ascending: true });
    
    const { data: activites } = await supabase
        .from("activities")
        .select("id, interaction_type, notes, contact_person, activity_date, follow_up_date")
        .eq("school_id", id)
        .order("activity_date", { ascending: false })
        .limit(5);
    
    const { data: documents } = await supabase
        .from("documents")
        .select("id, name, document_type, file_url, created_at")
        .eq("school_id", id)
        .order("created_at", { ascending: false });
    
    const contactRows = contacts ?? [];
    const teacherRows = teachers ?? [];
    const teacherNameByProfileId = new Map(
        teacherRows.flatMap((teacher) => {
            if (!teacher.profile_id) {
                return [];
            }

            const displayName =
                `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
                teacher.name ||
                "Primary teacher";

            return [[teacher.profile_id, displayName] as const];
        }),
    );
    const snapshotClassRows = (schoolClassRows ?? [])
        .filter((liaClass) =>
            teacherNameByProfileId.has(liaClass.teacher_profile_id),
        )
        .map((liaClass) => ({
            ...liaClass,
            teacherName: teacherNameByProfileId.get(liaClass.teacher_profile_id)!,
            studentCount: enrollmentCountByClassId.get(liaClass.id) ?? 0,
            serviceMinutes: serviceMinutesByClassId.get(liaClass.id) ?? 0,
        }))
        .sort(
            (firstClass, secondClass) =>
                firstClass.teacherName.localeCompare(secondClass.teacherName) ||
                firstClass.name.localeCompare(secondClass.name),
        );
    const snapshotClassIds = new Set(
        snapshotClassRows.map((liaClass) => liaClass.id),
    );
    const classroomStudentCount = new Set(
        (schoolEnrollmentRows ?? [])
            .filter((enrollment) =>
                snapshotClassIds.has(enrollment.lia_class_id),
            )
            .map((enrollment) => enrollment.student_id)
            .filter(Boolean),
    ).size;
    const snapshotTeacherCount = new Set(
        snapshotClassRows
            .map((liaClass) => liaClass.teacher_profile_id)
            .filter(Boolean),
    ).size;
    const totalServiceMinutes = snapshotClassRows.reduce(
        (total, liaClass) => total + liaClass.serviceMinutes,
        0,
    );
    const formatServiceHours = (minutes: number) => {
        const hours = minutes / 60;

        return new Intl.NumberFormat("en-US", {
            maximumFractionDigits: 1,
        }).format(hours);
    };
    const activityRows = activites ?? [];
    const latestActivity = activityRows[0] ?? null;
    const supabaseAdmin = createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );

    const documentRows = await Promise.all(
        (documents ?? []).map(async (document) => {
            if (!document.file_url) {
                return {
                    ...document,
                    signedUrl: null,
                    signedUrlError: "Missing file path",
                };
            }

            const { data, error } = await supabaseAdmin.storage
                .from("school-documents")
                .createSignedUrl(document.file_url, 60 * 10);
            
            return {
                ...document,
                signedUrl: data?.signedUrl ?? null,
                signedUrlError: error?.message ?? null,
            };
        })
    );

    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8'>
                <Link
                href='/schools'
                className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                >
                    Back to Schools
                </Link>
                <header className='mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='min-w-0'>
                            <div className='mb-3 flex flex-wrap items-center gap-3'>
                                <h1 className='break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl'>{school.name}</h1>
                                <span className='rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700'>
                                    {school.status}
                                </span>

                                {schoolLifeCycleStatus === "new" ? (
                                    <span className='rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700'>
                                        New School
                                    </span>
                                ) : null}
                            </div>

                            <p className='text-sm text-zinc-600'>
                                {school.address ?? "No address listed"}, {school.state}
                            </p>
                        </div>

                        <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end'>
                            <Link
                            href={`/schools/${school.id}/edit`}
                            className='inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto'
                            >
                                Edit School
                            </Link>

                            {isAdmin ? (
                                <Link
                                href={`/schools/${school.id}/delete`}
                                className='inline-flex h-10 w-full items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-[#c8102e] hover:bg-red-50 sm:w-auto'
                            >
                                Delete School
                            </Link>
                            ) : null}
                        </div>
                    </div>

                    <div className='mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2 lg:grid-cols-5'>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>Year Started</p>
                            <p className='mt-1 font-semibold'>
                                {school.year_lia_started ?? "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>State</p>
                            <p className='mt-1 font-semibold'>{school.state ?? "N/A"}</p>
                        </div>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>Region</p>
                            <p className='mt-1 font-semibold'>{school.region ?? "N/A"}</p>
                        </div>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>Assigned RPM</p>
                            <p className='mt-1 break-words font-semibold [overflow-wrap:anywhere]'>
                                {assignedRpmName}
                            </p>
                        </div>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>Last Contact</p>
                            <p className='mt-1 font-semibold'>
                                {latestActivity?.activity_date
                                    ? new Date(latestActivity.activity_date).toLocaleDateString(
                                        "en-US",
                                        {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        },
                                    )
                                    : "N/A"}
                            </p>
                        </div>
                    </div>
                </header>

                <section className='mt-5 grid items-start gap-5 lg:grid-cols-3'>
                    <div className='min-w-0 rounded-lg border border-red-100 bg-white shadow-sm lg:col-span-2'>
                        <div className='border-b border-zinc-100 p-4 sm:p-6'>
                            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <div>
                                    <h2 className='text-lg font-semibold'>School Snapshot</h2>
                                    <p className='mt-1 text-sm text-zinc-500'>
                                        Teachers, classes, enrollment, and service activity at this school.
                                    </p>
                                </div>
                                <span
                                    className={
                                        schoolLifeCycleStatus === "new"
                                            ? "w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                                            : "w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700"
                                    }
                                >
                                    {schoolLifeCycleLabel}
                                </span>
                            </div>

                            <div className='mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                                {[
                                    { label: "Teachers", value: snapshotTeacherCount },
                                    { label: "Classes", value: snapshotClassRows.length },
                                    { label: "Total Students", value: classroomStudentCount },
                                    {
                                        label: "Total Service Hours",
                                        value: formatServiceHours(totalServiceMinutes),
                                    },
                                ].map((metric) => (
                                    <div
                                        key={metric.label}
                                        className='rounded-md border border-red-100 bg-red-50/40 px-4 py-3'
                                    >
                                        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                            {metric.label}
                                        </p>
                                        <p className='mt-1 text-2xl font-semibold text-zinc-950'>
                                            {metric.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {snapshotClassRows.length > 0 ? (
                            <div className='overflow-x-auto'>
                                <table className='w-full min-w-[640px] text-left text-sm'>
                                    <thead className='bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500'>
                                        <tr>
                                            <th className='px-5 py-3 font-semibold'>Teacher</th>
                                            <th className='px-4 py-3 font-semibold'>Class</th>
                                            <th className='px-4 py-3 text-right font-semibold'>Students</th>
                                            <th className='px-5 py-3 text-right font-semibold'>Service Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-zinc-100'>
                                        {snapshotClassRows.map((liaClass, index) => {
                                            const previousClass = snapshotClassRows[index - 1];
                                            const showTeacher =
                                                !previousClass ||
                                                previousClass.teacher_profile_id !== liaClass.teacher_profile_id;

                                            return (
                                                <tr key={liaClass.id} className='hover:bg-red-50/30'>
                                                    <td className='px-5 py-4 font-medium text-zinc-900'>
                                                        {showTeacher ? liaClass.teacherName : ""}
                                                    </td>
                                                    <td className='px-4 py-4'>
                                                        <Link
                                                            href={`/classes/${liaClass.id}`}
                                                            className='font-semibold text-[#c8102e] hover:text-[#a70d25]'
                                                        >
                                                            {liaClass.name}
                                                        </Link>
                                                    </td>
                                                    <td className='px-4 py-4 text-right tabular-nums text-zinc-700'>
                                                        {liaClass.studentCount.toLocaleString("en-US")}
                                                    </td>
                                                    <td className='px-5 py-4 text-right tabular-nums text-zinc-700'>
                                                        {formatServiceHours(liaClass.serviceMinutes)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className='px-5 py-10 text-center'>
                                <p className='font-semibold text-zinc-900'>No classes yet</p>
                                <p className='mt-1 text-sm text-zinc-500'>
                                    Class-level enrollment and service totals will appear here.
                                </p>
                            </div>
                        )}
                    </div>

                    <SchoolProfileNotes
                        notes={school.notes}
                        saved={success === "notes-updated"}
                        saveError={error === "notes-update-failed"}
                        updateNotesAction={updateNotesForSchool}
                    />
                </section>

                <section className='mt-5 grid gap-5 lg:grid-cols-4'>
                    <div className='min-w-0 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-5'>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold">Contacts</h2>
                            <Link
                                href={`/schools/${school.id}/contacts/new`}
                                className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                            >
                                Add Contact
                            </Link>
                            </div>

                            <div className="space-y-3">
                            {contactRows.map((contact) => {
                                const deleteContactForSchool = deleteContact.bind(
                                    null,
                                    school.id,
                                    contact.id,
                                );
                                const contactDisplayName =
                                    `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
                                    contact.name;

                                return (
                                    <div
                                    key={contact.id}
                                    className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
                                    >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                        <div className="min-w-0">
                                            <p className="break-words font-semibold [overflow-wrap:anywhere]">{contactDisplayName}</p>
                                            <p className="text-sm text-zinc-500">{contact.role}</p>
                                            </div>

                                            <div className='flex shrink-0 flex-wrap items-center gap-2'>
                                                <Link
                                                    href={`/schools/${school.id}/contacts/${contact.id}/edit`}
                                                    prefetch={false}
                                                    className='inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]'
                                                >
                                                    Edit
                                                </Link>

                                                <Link
                                                    href={`/schools/${school.id}/contacts/${contact.id}`}
                                                    prefetch={false}
                                                    className='inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-[#c8102e]'
                                                    title="View contact"
                                                    aria-label={`View ${contactDisplayName}`}
                                                >
                                                    <Eye className='h-4 w-4'/>
                                                </Link>
                                                <form action={deleteContactForSchool} className='flex'>
                                                    {isAdmin ? (
                                                        <button
                                                        type="submit"
                                                        className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                                    >
                                                        Delete
                                                    </button>
                                                    ) : null}
                                            </form>
                                        </div>
                                    </div>

                                    <p className="mt-2 break-words text-sm text-zinc-600 [overflow-wrap:anywhere]">{contact.email}</p>
                                    <p className="break-words text-sm text-zinc-600 [overflow-wrap:anywhere]">{contact.phone}</p>
                                    </div>
                                );
                                })}

                            {contactRows.length === 0 ? (
                                <p className="text-sm text-zinc-500">No contacts added yet.</p>
                            ) : null}
                            </div>
                    </div>
                
                <div className='min-w-0 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-5'>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">Teachers</h2>
                        <Link 
                            href={`/schools/${school.id}/teachers/new`}
                            className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]">
                            Add Teacher
                        </Link>
                        </div>
                        <div className="space-y-3">
                        {teacherRows.map((teacher) => {
                            const deleteTeacherForSchool = deleteTeacher.bind(
                                null,
                                school.id,
                                teacher.id,
                            );
                            const teacherDisplayName =
                                `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
                                teacher.name;

                            return (
                                <div
                                key={teacher.id}
                                className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
                                >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <p className="break-words font-semibold [overflow-wrap:anywhere]">{teacherDisplayName}</p>

                                    {teacher.is_new_teacher ? (
                                        <span className="whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]">
                                        New Teacher
                                        </span>
                                    ) : null}

                                    {teacher.reporting_role === "co_teacher_only" ? (
                                        <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                            Co-teacher only
                                        </span>
                                    ) : null}
                                    </div>

                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        <Link
                                            href={`/schools/${school.id}/teachers/${teacher.id}/edit`}
                                            prefetch={false}
                                            className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                        >
                                            Edit
                                        </Link>

                                        <Link
                                            href={`/schools/${school.id}/teachers/${teacher.id}`}
                                            prefetch={false}
                                            className='inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-[#c8102e]'
                                            title="View teacher"
                                            aria-label={`View ${teacherDisplayName}`}
                                        >
                                            <Eye className='h-4 w-4'/>
                                        </Link>

                                        <form action={deleteTeacherForSchool} className="flex">
                                            {isAdmin ? (
                                                <button
                                                type="submit"
                                                className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                            >
                                                Delete
                                            </button>
                                            ) : null}
                                        </form>
                                    </div>
                                </div>

                                <p className="mt-2 break-words text-sm text-zinc-600 [overflow-wrap:anywhere]">{teacher.email}</p>
                                <p className="break-words text-sm text-zinc-600 [overflow-wrap:anywhere]">{teacher.phone}</p>

                                {teacher.program_level ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]">
                                            {formatProgramLevel(teacher.program_level)}
                                        </span>
                                    </div>
                                ) : null}

                                {teacher.notes ? (
                                    <p className='mt-3 break-words rounded-md border border-zinc-100 bg-white px-3 py-2 text-sm leading-6 text-zinc-600 [overflow-wrap:anywhere]'>
                                        {teacher.notes}
                                    </p>
                                ) : null}
                                <div className='mt-3 flex flex-wrap items-center gap-2'>
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                                            teacher.status ==="active"
                                                ? "bg-green-50 text-green-700"
                                                : "bg-red-50 text-[#c8102e]"
                                        }`}
                                    >
                                        {teacher.status}
                                    </span>

                                    <span className='text-xs font-semibold uppercase text-zinc-500'>
                                        {teacher.password_status}
                                    </span>
                                </div>
                                </div>
                            );
                            })}

                        {teacherRows.length === 0 ? (
                            <p className="text-sm text-zinc-500">No teachers added yet.</p>
                        ) : null}
                    </div>
                </div>

                <div className='min-w-0 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-5'>
                    <div className='mb-4 flex items-center justify-between gap-3'>
                        <h2 className='text-lg font-semibold'>Activity Log</h2>
                        <Link 
                            href={`/schools/${school.id}/activities/new`}
                            className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                        >
                            Log Activity
                        </Link>
                    </div>

                    <div className='space-y-3'>
                        {activityRows.map((activity) => {
                            const deleteActivityForSchool = deleteActivity.bind(
                                null,
                                school.id,
                                activity.id,
                            );

                            return (
                                <div
                                key={activity.id}
                                className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
                                >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                    <div className='min-w-0'>
                                    <p className="break-words font-semibold [overflow-wrap:anywhere]">{activity.interaction_type}</p>
                                    <p className="break-words text-sm text-zinc-600 [overflow-wrap:anywhere]">{activity.notes}</p>
                                    </div>

                                   <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        <Link
                                            href={`/schools/${school.id}/activities/${activity.id}/edit`}
                                            prefetch={false}
                                            className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                        >
                                            Edit
                                        </Link>

                                        <form action={deleteActivityForSchool} className="flex">
                                            {isAdmin ? (
                                                <button
                                                type="submit"
                                                className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                                >
                                                    Delete
                                            </button>
                                            ) : null}
                                        </form>
                                     </div>
                                </div>

                                <p className="mt-2 text-xs text-zinc-500">
                                    {activity.activity_date}
                                    {activity.contact_person ? ` · ${activity.contact_person}` : ""}
                                </p>
                                </div>
                            );
                            })}

                        {activityRows.length === 0 ? (
                            <p className='text-sm text-zinc-500'>No activity added yet.</p>
                        ) : null}
                    </div>
                </div>

                <div className='min-w-0 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-5'>
                    <div className='mb-4 flex items-center justify-between gap-3'>
                        <h2 className='text-lg font-semibold'>Documents</h2>
                        <Link 
                            href={`/schools/${school.id}/documents/new`}
                            className='text-sm font-semibold text-[#c8102e]'>
                            Upload
                        </Link>
                    </div>

                    <div className='space-y-3'>
                        {documentRows.map((document) => {
                            const deleteDocumentForSchool = deleteDocument.bind(
                                null,
                                school.id,
                                document.id,
                            );

                            return (
                                <div
                                key={document.id}
                                className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
                                >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                    <div className="min-w-0">
                                    {document.signedUrl ? (
                                        <a
                                            href={document.signedUrl}
                                            target='_blank'
                                            rel="noreferrer"
                                            className='break-words font-semibold text-zinc-950 hover:text-[#c8102e] hover:underline [overflow-wrap:anywhere]'
                                        >
                                            {document.name}
                                        </a>
                                    ) : (
                                        <p className='break-words font-semibold text-zinc-950 [overflow-wrap:anywhere]'>
                                            {document.name}
                                        </p>
                                    )}
                                    <p className="text-sm text-zinc-500">{document.document_type}</p>
                                    </div>

                                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                                        {document.signedUrl ? (
                                            <a
                                                href={document.signedUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                            >
                                                Open
                                            </a>
                                        ) : (
                                            <span
                                                className="text-xs font-semibold text-zinc-300"
                                                title={document.signedUrlError ?? "Document preview link unavailable"}
                                            >
                                                Unavailable
                                            </span>
                                        )}

                                        <form action={deleteDocumentForSchool} className="flex">
                                        {isAdmin ? (
                                            <button
                                            type="submit"
                                            className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                        >
                                            Delete
                                        </button>
                                        ) : null}
                                        </form>
                                    </div>
                                </div>
                                </div>
                            );
                            })}

                        {documentRows.length === 0 ? (
                            <p className='text-sm text-zinc-500'>No documents added yet.</p>
                        ) : null}
                    </div>
                </div>
             </section>
            </section>
        </main>
    );
}
    

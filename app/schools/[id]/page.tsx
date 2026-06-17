import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';
import { Eye } from 'lucide-react';
import { 
    deleteActivity,
    deleteContact,
    deleteDocument,
    deleteTeacher,
} from './actions'


type SchoolProfilePageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function SchoolProfilePage({
    params,
}: SchoolProfilePageProps) {
    const {id} = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: school } = await supabase
        .from("schools")
        .select(`
            id,
            name,
            year_lia_started,
            address:city,
            state,
            region,
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
    
    const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, first_name, last_name, role, email, phone, status, notes")
        .eq("school_id", id)
        .order("role", { ascending: true });
    
    const { data: teachers } = await supabase
        .from("teachers")
        .select("id, name, first_name, last_name, email, phone, status, username, password_status, is_new_teacher")
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
    const activityRows = activites ?? [];
    const documentRows = documents ?? [];

    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='ml-64 min-h-screen px-8 py-6'>
                <Link
                href='/schools'
                className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                >
                    Back to Schools
                </Link>
                <header className='mt-5 rounded-lg border border-red-100 bg-white p-6 shadow-sm'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                        <div>
                            <div className='mb-3 flex items-center gap-3'>
                                <h1 className='text-3xl font-semibold'>{school.name}</h1>
                                <span className='rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700'>
                                    {school.status}
                                </span>
                            </div>

                            <p className='text-sm text-zinc-600'>
                                {school.address ?? "No address listed"}, {school.state}
                            </p>
                        </div>

                        <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
                            <Link
                            href={`/schools/${school.id}/edit`}
                            className='inline-flex h-10 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]'
                            >
                                Edit School
                            </Link>

                            <Link
                                href={`/schools/${school.id}/delete`}
                                className='inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-[#c8102e] hover:bg-red-50'
                            >
                                Delete School
                            </Link>
                        </div>
                    </div>

                    <div className='mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2 lg:grid-cols-4'>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>Year Started</p>
                            <p className='mt-1 font-semibold'>
                                {school.year_lia_started ?? "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>Region</p>
                            <p className='mt-1 font-semibold'>{school.region ?? "N/A"}</p>
                        </div>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>MOU Status</p>
                            <p className='mt-1 font-semibold'>{school.mou_status ?? "N/A"}</p>
                        </div>
                        <div>
                            <p className='text-xs uppercase text-zinc-500'>Last Contact</p>
                            <p className='mt-1 font-semibold'>{school.last_contact_date ?? "N/A"}</p>
                        </div>
                    </div>
                </header>

                <section className='mt-5 grid gap-5 lg:grid-cols-3'>
                    <div className='min-h-48 rounded-lg border border-red-100 bg-white p-6 shadow-sm lg:col-span-2'>
                        <h2 className='text-lg font-semibold'>Profile Notes</h2>
                        <p className='mt-3 text-sm text-zinc-600'>
                            {school.notes ?? "No notes yet."}
                        </p>
                    </div>

                    <div className='min-h-48 rounded-lg border border-red-100 bg-white p-6 shadow-sm'>
                        <h2 className='text-lg font-semibold'>School Snapshot</h2>
                        <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1'>
                            <div>
                                <p className='text-sm text-zinc-500'>Total Students</p>
                                <p className='text-2xl font-semibold'>
                                    {school.student_count ?? 0}
                                </p>
                            </div>
                            <div>
                                <p className='text-sm text-zinc-500'>Chapter Size</p>
                                <p className='text-2xl font-semibold'>
                                    {school.chapter_size ?? 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className='mt-5 grid gap-5 lg:grid-cols-4'>
                    <div className='rounded-lg border border-red-100 bg-white p-5 shadow-sm'>
                        <div className="mb-4 flex items-center justify-between">
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
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="break-words font-semibold [overflow-wrap:anywhere]">{contactDisplayName}</p>
                                            <p className="text-sm text-zinc-500">{contact.role}</p>
                                            </div>

                                            <div className='flex shrink-0 items-center gap-2'>
                                                <Link
                                                    href={`/schools/${school.id}/contacts/${contact.id}/edit`}
                                                    className='inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]'
                                                >
                                                    Edit
                                                </Link>

                                                <Link
                                                    href={`/schools/${school.id}/contacts/${contact.id}`}
                                                    className='inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-[#c8102e]'
                                                    title="View contact"
                                                    aria-label={`View ${contactDisplayName}`}
                                                >
                                                    <Eye className='h-4 w-4'/>
                                                </Link>
                                                <form action={deleteContactForSchool} className='flex'>
                                                    <button
                                                        type="submit"
                                                        className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                                    >
                                                        Delete
                                                    </button>
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
                
                <div className='rounded-lg border border-red-100 bg-white p-5 shadow-sm'>
                    <div className="mb-4 flex items-center justify-between">
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
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <p className="break-words font-semibold [overflow-wrap:anywhere]">{teacherDisplayName}</p>

                                    {teacher.is_new_teacher ? (
                                        <span className="whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]">
                                        New Teacher
                                        </span>
                                    ) : null}
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <Link
                                            href={`/schools/${school.id}/teachers/${teacher.id}/edit`}
                                            className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                        >
                                            Edit
                                        </Link>

                                        <Link
                                            href={`/schools/${school.id}/teachers/${teacher.id}`}
                                            className='inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-[#c8102e]'
                                            title="View teacher"
                                            aria-label={`View ${teacherDisplayName}`}
                                        >
                                            <Eye className='h-4 w-4'/>
                                        </Link>

                                        <form action={deleteTeacherForSchool} className="flex">
                                            <button
                                                type="submit"
                                                className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                            >
                                                Delete
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <p className="mt-2 break-words text-sm text-zinc-600 [overflow-wrap:anywhere]">{teacher.email}</p>
                                <p className="break-words text-sm text-zinc-600 [overflow-wrap:anywhere]">{teacher.phone}</p>
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

                <div className='rounded-lg border border-red-100 bg-white p-5 shadow-sm'>
                    <div className='mb-4 flex items-center justify-between'>
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
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                    <p className="font-semibold">{activity.interaction_type}</p>
                                    <p className="text-sm text-zinc-600">{activity.notes}</p>
                                    </div>

                                   <div className="flex items-center gap-2">
                                        <Link
                                            href={`/schools/${school.id}/activities/${activity.id}/edit`}
                                            className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                        >
                                            Edit
                                        </Link>

                                        <form action={deleteActivityForSchool} className="flex">
                                            <button
                                                type="submit"
                                                className="inline-flex h-6 items-center text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                                >
                                                    Delete
                                            </button>
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

                <div className='rounded-lg border border-red-100 bg-white p-5 shadow-sm'>
                    <div className='mb-4 flex items-center justify-between'>
                        <h2 className='text-lg font-semibold'>Documents</h2>
                        <button className='text-sm font-semibold text-[#c8102e]'>
                            Upload
                        </button>
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
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                    <p className="font-semibold">{document.name}</p>
                                    <p className="text-sm text-zinc-500">{document.document_type}</p>
                                    </div>

                                    <form action={deleteDocumentForSchool}>
                                    <button
                                        type="submit"
                                        className="text-xs font-semibold text-zinc-400 hover:text-[#c8102e]"
                                    >
                                        Delete
                                    </button>
                                    </form>
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
    

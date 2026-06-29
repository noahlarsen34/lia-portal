import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';
import { createTeacher } from './actions';

type  AddTeacherPageProps = {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function AddTeacherPage({
    params,
    searchParams,
}: AddTeacherPageProps) {
    const { id } = await params;
    const { error } = await searchParams;

    const supabase = await createClient();

    const {
        data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: school } = await supabase
        .from("schools")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

    if (!school) {
        redirect('/schools');
    }

    const createTeacherForSchool = createTeacher.bind(null, school.id);

    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8'>
                <div className='mx-auto max-w-3xl'>
                    <Link
                    href={`/schools/${school.id}`}
                    className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                    >
                        Back to {school.name}
                    </Link>

                    <section className='mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6'>
                        <div className='mb-6'>
                            <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                                Add Teacher
                            </p>
                            <h1 className='mt-2 break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl'>{school.name}</h1>
                            <p className='mt-1 text-sm text-zinc-600'>
                                Add a teacher record for this school.
                            </p>
                        </div>

                        {error ? (
                            <div className='mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                                {error === "missing-fields"
                                    ? "First name, last name, and email are required."
                                    : "Something went wrong. Please try again."
                                }
                            </div>
                        ) : null}

                        <form action={createTeacherForSchool} className='space-y-5'>
                            <div className='grid gap-5 sm:grid-cols-2'>
                                <label className='block min-w-0'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        First Name
                                    </span>
                                    <input
                                        name="first_name"
                                        required
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    />
                                </label>

                                <label className='block min-w-0'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        Last Name
                                    </span>
                                    <input
                                        name="last_name"
                                        required
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    />
                                </label>
                            </div>

                            <div className='grid gap-5 sm:grid-cols-2'>
                                <label className='block min-w-0'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        Email
                                    </span>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    />
                                </label>

                                <label className='block min-w-0'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        Phone
                                    </span>
                                    <input
                                        name="phone"
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    />
                                </label>
                            </div>

                            <label className='block min-w-0'>
                                <span className='text-sm font-medium text-zinc-800'>
                                    Username
                                </span>
                                <input
                                    name='username'
                                    className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                />
                            </label>

                            <label className='block min-w-0'>
                                <span className='text-sm font-medium text-zinc-800'>
                                    Status
                                </span>
                                <select
                                    name='status'
                                    defaultValue='active'
                                    className='mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                >
                                    <option value='active'>Active</option>
                                    <option value='inactive'>Inactive</option>
                                </select>
                            </label>

                            <label className='flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3'>
                                <input
                                    name="is_new_teacher"
                                    type="checkbox"
                                    className='h-4 w-4 accent-[#c8102e]'
                                />
                                <span className='text-sm font-medium text-zinc-800'>
                                    This is the teacher&apos;s first year with LIA 
                                </span>
                            </label>

                            <div className='flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end'>
                                <Link
                                    href={`/schools/${school.id}`}
                                    className='inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto'
                                >
                                    Cancel
                                </Link>

                                <button
                                    type='submit'
                                    className='inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto'
                                >
                                    Save Teacher
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </section>
        </main>
    );
}

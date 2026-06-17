import Link from 'next/link';
import { notFound, redirect } from "next/navigation";
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';

type TeacherPageProps = {
    params: Promise<{
        id: string;
        teacherId: string;
    }>;
};

export default async function TeacherPage({ params }: TeacherPageProps) {
    const { id, teacherId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: school } = await supabase
        .from("schools")
        .select("id, name")
        .eq("id", id)
        .single();

    const { data: teacher } = await supabase
        .from("teachers")
        .select(
            "id, first_name, last_name, name, email, phone, status, username, password_status, is_new_teacher"
        )
        .eq("id", teacherId)
        .eq("school_id", id)
        .single();
    
    if (!school || !teacher) {
        notFound();
    }

    const displayName = 
        `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
        teacher.name
    
    return (
        <main className='flex min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='flex-1 px-8 py-8'>
                <div className='mx-auto w-full max-w-3xl'>
                    <Link
                        href={`/schools/${school.id}`}
                        className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                    >
                        Back to {school.name}
                    </Link>

                    <section className='mt-6 rounded-lg border border-red-100 bg-white p-8 shadow-sm'>
                        <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                            Teacher Profile
                        </p>

                        <div className='mt-3 flex flex-wrap items-center gap-3'>
                            <h1 className='text-3xl font-semibold'>{displayName}</h1>
                            <span className='rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700'>
                                {teacher.status}
                            </span>
                            
                            {teacher.is_new_teacher ? (
                                <span className='rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#c8102e]'>
                                    New Teacher
                                </span>
                            ) : null}
                        </div>

                        <div className='mt-8 grid gap-6 border-t border-zinc-100 pt-6 md:grid-cols-2'>
                            <div>
                                <p className='text-sm uppercase text-zinc-500'>First Name</p>
                                <p className='mt-1 font-semibold'>
                                    {teacher.first_name || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Last Name</p>
                                <p className='mt-1 font-semibold'>
                                    {teacher.last_name || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Email</p>
                                <p className='mt-1 font-semibold'>
                                    {teacher.email || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Phone</p>
                                <p className='mt-1 font-semibold'>
                                    {teacher.phone || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Username</p>
                                <p className='mt-1 font-semibold'>
                                    {teacher.username || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>
                                    Password Status
                                </p>
                                <p className='mt-1 font-semibold capitalize'>
                                    {teacher.password_status || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Status</p>
                                <p className='mt-1 font-semibold capitalize'>
                                    {teacher.status}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>
                                    First Year With LIA
                                </p>
                                <p className='mt-1 font-semibold'>
                                    {teacher.is_new_teacher ? "Yes": "No"}
                                </p>
                            </div>
                        </div>

                        <div className='mt-8 flex justify-end gap-3 border-t border-zinc-100 pt-6'>
                            <Link
                                href={`/schools/${school.id}`}
                                className='rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-red-50'
                            >
                                Back
                            </Link>

                            <Link
                                href={`/schools/${school.id}/teachers/${teacher.id}/edit`}
                                className='rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a70d25]'
                            >
                                Edit Teacher
                            </Link>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}
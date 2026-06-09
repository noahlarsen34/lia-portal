import { DashboardSidebar } from '@/components/dashboard-sidebar';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from "@/utils/supabase/server";
import { deleteSchool } from '../actions'

type DeleteSchoolPageProps = {
    params: Promise<{
        id: string;
    
    }>;
};

export default async function DeleteSchoolPage({
    params,
}: DeleteSchoolPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: school } = await supabase
        .from("schools")
        .select("id, name")
        .eq("id",id)
        .maybeSingle();
    
    if (!school) {
        redirect("/schools");
    }

    const deleteSchoolById = deleteSchool.bind(null, school.id);

    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='ml-64 min-h-screen px-8 py-6'>
                <div className='mx-auto max-w-2xl'>
                    <Link
                        href={`/schools/${school.id}`}
                        className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                    >
                        Back to {school.name}
                    </Link>

                    <section className='mt-5 rounded-lg border border-red-200 bg-white p-6 shadow-sm'>
                        <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                            Delete School
                        </p>

                        <h1 className='mt-2 text-3xl font-semibold'>
                            Delete {school.name}?
                        </h1>

                        <p className='mt-3 text-sm text-zinc-600'>
                            This will permanently delete this school profile. Related contacts, teachers, activites, and documents may also be removed.
                        </p>

                        <div className='mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                            This action cannot be undone
                        </div>

                        <div className='mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-5'>
                            <Link
                                href={`/schools/${school.id}`}
                                className='inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]'
                            >
                                Cancel
                            </Link>
                            <form action={deleteSchoolById}>
                                <button
                                    type="submit"
                                    className='inline-flex h-10 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]'
                                >
                                    Delete School
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}

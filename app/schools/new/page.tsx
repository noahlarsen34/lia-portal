import Link from 'next/link';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { SchoolForm } from './school-form';
import { requireAdmin } from '@/utils/role-guards';

type AddSchoolPageProps = {
    searchParams: Promise<{
        error?: string;
        state?: string;
    }>;
};

export default async function AddSchoolPage({
    searchParams,
}: AddSchoolPageProps) {
    const{ error, state } = await searchParams;

    const { supabase } = await requireAdmin();

    const { data: districts } = await supabase
        .from("districts")
        .select("id, name, state")
        .order("name", { ascending: true });

    const { data: rpms } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["admin", "rpm"])
        .order("full_name", { ascending: true });

    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8'>
                <div className='mx-auto max-w-5xl'>
                    <Link
                        href='/schools'
                        className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                    >
                        Back to Schools
                    </Link>

                    <SchoolForm
                        districts={districts ?? []}
                        rpms={rpms ?? []}
                        error={error}
                        initialState={state}
                    />
                </div>
            </section>
        </main>
    );
}

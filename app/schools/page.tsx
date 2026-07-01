import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';
import { SchoolsTable } from './schools-table';

export default async function SchoolsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: schools, error: schoolsError } = await supabase
        .from("schools")
        .select(`
            id,
            name,
            year_lia_started,
            address:city,
            state,
            region,
            district_id,
            assigned_rpm_id,
            school_level,
            status,
            mou_status,
            updated_at
            `)
        .order("name", { ascending: true });
        const { data: districtRows } = await supabase
            .from("districts")
            .select("id, name");

        const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, full_name");

        const districtsById = new Map(
            districtRows?.map((district) => [district.id, district.name]) ?? [],
        );

        const profilesById = new Map(
            profileRows?.map((profile) => [profile.id, profile.full_name]) ?? [],
        );

    const schoolRows =
        schools?.map((school) => ({
            id: school.id,
            name: school.name,
            year_lia_started: school.year_lia_started,
            address: school.address,
            state: school.state,
            region: school.region,
            district: school.district_id
                ? districtsById.get(school.district_id) ?? "N/A"
                : "N/A",
            rpm: school.assigned_rpm_id
                ? profilesById.get(school.assigned_rpm_id) ?? "Unassigned"
                : "Unassigned",
            schoolLevel: school.school_level ?? "unknown",
            status: school.status,
            mouStatus: school.mou_status,
            updatedAt: school.updated_at,
        })) ?? [];
        
    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8'>
              <div className='mx-auto w-full max-w-7xl'>
                <header className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                        <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                            Schools Database
                        </p>
                        <h1 className='mt-2 text-3xl font-semibold'>Schools</h1>
                        <p className='mt-1 text-sm text-zinc-600'>
                            View and manage school profiles for Latinos In Action
                        </p>
                    </div>
                    <Link
                        href='/schools/new'
                        className='flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a70d25] sm:w-fit'                    >
                        Add School
                    </Link>
                </header>
                
                <section className='overflow-hidden rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6'>
                    <SchoolsTable schools={schoolRows} />

                    {schoolsError ? (
                        <p className='mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                            Could not load schools: {schoolsError.message}
                        </p>
                    ) : null}

                    {!schoolsError && schoolRows.length === 0 ? (
                        <div className='mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500'>
                            No schools found yet.
                        </div>
                    ) : null}
                </section>
              </div>
            </section>
        </main>
    );
}

    

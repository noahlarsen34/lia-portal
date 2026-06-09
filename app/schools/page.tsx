import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';

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
            city,
            state,
            region,
            district_id,
            assigned_rpm_id,
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
            city: school.city,
            state: school.state,
            region: school.region,
            district: school.district_id
                ? districtsById.get(school.district_id) ?? "N/A"
                : "N/A",
            rpm: school.assigned_rpm_id
                ? profilesById.get(school.assigned_rpm_id) ?? "Unassigned"
                : "Unassigned",
            status: school.status,
            mouStatus: school.mou_status,
            updatedAt: school.updated_at,
        })) ?? [];
        
    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='ml-64 min-h-screen px-8 py-6'>
              <div className='mx-auto max-w-7xl'>
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
                </header>
                
                <section className='rounded-lg border border-red-100 bg-white p-6 shadow-sm'>
                    <div className='mb-6 flex flex-wrap gap-3'>
                        <input 
                            className='h-10 w-full rounded-md border border-zinc-200 px-3 text-sm sm:w-72' 
                            placeholder='Search Schools...'
                        />
                        <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                            State
                        </button>
                        <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                            Region
                        </button>
                        <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                            Status
                        </button>
                        <button className="rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]">
                            RPM
                        </button>
                        <button className='rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]'>
                            MOU Status
                        </button>
                        <button className="rounded-md border border-zinc-200 px-4 text-sm hover:bg-red-50 hover:text-[#c8102e]">
                            Filter
                        </button>
                         <Link
                        href="/schools/new"
                        className='w-fit rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a70d25]'
                        >
                        Add School
                        </Link>
                    </div>
                    <div className='overflow-x-auto'>
                        <table className='min-w-[1180px] w-full border-collapse text-left text-sm'>
                            <thead>
                                <tr className='border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500'>
                                    <th className='w-56 px-4 py-3'>School Name</th>
                                    <th className='px-4 py-3'>Year Started LIA</th>
                                    <th className='px-4 py-3'>City</th>
                                    <th className='w-24 px-4 py-3'>State</th>
                                    <th className='w-28 px-4 py-3'>Region</th>
                                    <th className='w-72 px-4 py-3'>District</th>
                                    <th className='px-4 py-3'>Assigned RPM</th>
                                    <th className='px-4 py-3'>Status</th>
                                    <th className='px-4 py-3'>MOU</th>
                                    <th className='px-4 py-3'>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schoolRows.map((school) => (
                                    <tr
                                        key={school.id}
                                        className='border-b border-zinc-100 hover:bg-red-50/60'
                                    >
                                        <td className='px-4 py-5 font-semibold'>
                                            <Link
                                                href={`/schools/${school.id}`}
                                                className='text-zinc-950 hover:text-[#c8102e]'
                                            >
                                                {school.name}
                                            </Link>
                                        </td>
                                        <td className='px-4 py-5'>{school.year_lia_started}</td>
                                        <td className='w-28 px-4 py-5'>{school.city ?? "N/A"}</td>
                                        <td className='w-24 px-4 py-5'>{school.state}</td>
                                        <td className='w-28 px-4 py-5'>{school.region ?? "N/A"}</td>
                                        <td className='px-4 py-5'>{school.district ?? "N/A"}</td>
                                        <td className='px-4 py-5'>{school.rpm}</td>
                                        <td className='px-4 py-5'>
                                            <span className='whitespace-nowrap rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700'>
                                                {school.status}
                                            </span>
                                        </td>
                                        <td className='px-4 py-5'>
                                            <span className='whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]'>
                                                {school.mouStatus}
                                            </span>
                                        </td>
                                        <td className='px-4 py-5'>
                                            {new Date(school.updatedAt).toLocaleDateString('en-US', {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

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

    

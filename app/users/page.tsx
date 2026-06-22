import Link from 'next/link';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { requireAdmin } from '@/utils/role-guards';
import { UsersTable } from './users-table';

export default async function UsersPage() {
    const { supabase } = await requireAdmin();

    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .order("full_name", { ascending: true });
    
    const { data: schools } = await supabase
        .from("schools")
        .select("assigned_rpm_id");
    
    const assignedSchoolCounts = new Map<string, number>();

    schools?.forEach((school) => {
        if (!school.assigned_rpm_id) return;

        assignedSchoolCounts.set(
            school.assigned_rpm_id,
            (assignedSchoolCounts.get(school.assigned_rpm_id) ?? 0) + 1
        );
    });

    const userRows = 
        profiles?.map((profile) => ({
            id: profile.id,
            name: profile.full_name ?? "Unnamed user",
            email: profile.email ?? "No email listed",
            role: profile.role,
            assignedSchools: assignedSchoolCounts.get(profile.id) ?? 0,
        })) ?? [];
    
    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='ml-64 min-h-screen px-8 py-6'>
                <div className='mx-auto max-w-6xl'>
                    <header className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div>
                            <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                                Users
                            </p>
                            <h1 className='mt-2 text-3xl font-semibold'>User Manager</h1>
                            <p className='mt-1 text-sm text-zinc-600'>
                                Manage admins, RPMs, and school assignments.
                            </p>
                        </div>
                    </header>

                    <UsersTable users={userRows} />
                </div>
            </section>
        </main>
    );
}

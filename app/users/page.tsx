import Link from 'next/link';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { requireAdmin } from '@/utils/role-guards';

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

                    <section className='rounded-lg border border-red-100 bg-white p-6 shadow-sm'>
                        <div className='overflow-x-auto'>
                            <table className='w-full min-w-[760px] border-collapse text-left text-sm'>
                                <thead>
                                    <tr className='border-b border-zinc-100 text-xs uppercase text-zinc-500'>
                                        <th className='px-4 py-3 font-semibold'>Name</th>
                                        <th className='px-4 py-3 font-semibold'>Email</th>
                                        <th className='px-4 py-3 font-semibold'>Role</th>
                                        <th className='px-4 py-3 font-semibold'>
                                            Assigned Schools
                                        </th>
                                        <th className='px-4 py-3 text-right font-semibold'>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {userRows.map((user) => (
                                        <tr
                                            key={user.id}
                                            className='border-b border-zinc-100 last:border-0'
                                        >
                                            <td className='px-4 py-4 font-semibold'>{user.name}</td>
                                            <td className='px-4 py-4 text-zinc-600'>
                                                {user.email}
                                            </td>
                                            <td className='px-4 py-4'>
                                                <span className='rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]'>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className='px-4 py-4 text-zinc-600'>
                                                {user.assignedSchools}
                                            </td>
                                            <td className='px-4 py-4 text-right'>
                                                <Link
                                                    href={`/users/${user.id}`}
                                                    className='inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]'
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {userRows.length === 0 ? (
                            <div className='mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500'>
                                No users found yet.
                            </div>
                        ) : null}
                    </section>
                </div>
            </section>
        </main>
    );
}

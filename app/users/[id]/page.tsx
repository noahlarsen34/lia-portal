import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { requireAdmin } from '@/utils/role-guards';
import { 
    assignSchoolToUser, 
    unassignSchoolFromUser,
    updateUserRole, 
} from './actions';
import { AssignSchoolForm } from './assign-school-form';

type UserDetailPageProps = {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function UserDetailPage ({ params, searchParams }: UserDetailPageProps) {
    const { id } = await params;
    const { error } = await searchParams;
    const { supabase } = await requireAdmin();

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", id)
        .maybeSingle();
    
    if (!profile) {
        redirect("/users");
    }

    const { data: schools } = await supabase
        .from('schools')
        .select(
            `
                id,
                name,
                state,
                region,
                status,
                mou_status,
                updated_at
            `
        )
        .eq("assigned_rpm_id",profile.id)
        .order("name", {ascending: true});
    
    const { data: unassignedSchools } = await supabase
        .from("schools")
        .select("id, name, state")
        .is("assigned_rpm_id", null)
        .order("name", {ascending: true});
    
    const assignedSchools = 
        schools?.map((school) => ({
            id: school.id,
            name: school.name,
            state: school.state,
            region: school.region ?? "N/A",
            status: school.status,
            mouStatus: school.mou_status,
            updated: new Date(school.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            }),
        })) ?? [];
    
    const availableSchools = 
        unassignedSchools?.map((school) => ({
            id: school.id,
            name: school.name,
            state: school.state
        })) ?? [];
    
    const assignSchool = assignSchoolToUser.bind(null,profile.id);

    const updateRole = updateUserRole.bind(null, profile.id);
    
    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8'>
                <div className='mx-auto max-w-6xl'>
                    <Link
                        href='/users'
                        className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                    >
                        Back to Users
                    </Link>

                    <header className='mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6'>
                        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='min-w-0'>
                                <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                                    User Profile
                                </p>

                                <div className='mt-2 flex flex-wrap items-center gap-3'>
                                    <h1 className='break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl'>
                                        {profile.full_name ?? "Unnamed user"}
                                    </h1>

                                    <span className='rounded-full bg-red-50 px-3 py-1 text-xs font-semibold capitalize text-[#c8102e]'>
                                        {profile.role}
                                    </span>
                                </div>

                                <p className='mt-2 break-words text-sm text-zinc-600 [overflow-wrap:anywhere]'>
                                    {profile.email ?? "No email listed"}
                                </p>
                            </div>

                            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                                <div className="rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm">
                                    <p className="text-zinc-500">Assigned Schools</p>
                                    <p className="mt-1 text-2xl font-semibold">
                                    {assignedSchools.length}
                                    </p>
                                </div>

                                <form
                                    action={updateRole}
                                    className="rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm"
                                >
                                    <label className="text-zinc-500">Role</label>

                                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                    <select
                                        name="role"
                                        defaultValue={profile.role}
                                        className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100 sm:w-auto"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="rpm">RPM</option>
                                    </select>

                                    <button
                                        type="submit"
                                        className="h-9 w-full rounded-md bg-[#c8102e] px-3 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                                    >
                                        Save
                                    </button>
                                    </div>
                                </form>
                                </div>
                        </div>
                    </header>

                    <section className='mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6'>
                        {error ? (
                            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error === "missing-school"
                                ? "Choose a school before assigning."
                                : error === "invalid-role"
                                    ? "Choose a valid role."
                                    : error === "cannot-change-own-role"
                                    ? "You cannot remove your own admin role."
                                    : error === "role-update-failed"
                                        ? "The role could not be updated."
                                        : "Something went wrong. Please try again."}
                            </div>
                            ) : null}

                        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">Assigned Schools</h2>
                                <p className="mt-1 text-sm text-zinc-600">
                                Schools currently assigned to this user.
                                </p>
                            </div>

                            <AssignSchoolForm
                                availableSchools={availableSchools}
                                action={assignSchool}
                            />
                            </div>

                        <div className='overflow-x-auto'>
                            <table className='w-full min-w-[760px] border-collapse text-left text-sm'>
                                <thead>
                                    <tr className='border-b border-zinc-100 text-xs uppercase text-zinc-500'>
                                        <th className='px-4 py-3 font-semibold'>School Name</th>
                                        <th className='px-4 py-3 font-semibold'>State</th>
                                        <th className='px-4 py-3 font-semibold'>Region</th>
                                        <th className='px-4 py-3 font-semibold'>Status</th>
                                        <th className='px-4 py-3 font-semibold'>MOU</th>
                                        <th className='px-4 py-3 font-semibold'>Last Updated</th>
                                        <th className='px-4 py-3 text-right font-semibold'>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {assignedSchools.map((school) => (
                                        <tr
                                            key={school.id}
                                            className='border-b border-zinc-100 last:border-0'
                                        >
                                            <td className='break-words px-4 py-4 font-semibold [overflow-wrap:anywhere]'>
                                                {school.name}
                                            </td>
                                            <td className='break-words px-4 py-4 text-zinc-600 [overflow-wrap:anywhere]'>
                                                {school.state}
                                            </td>
                                            <td className='px-4 py-4 text-zinc-600'>
                                                {school.region}
                                            </td>
                                            <td className='px-4 py-4'>
                                                <span className='rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700'>
                                                    {school.status}
                                                </span>
                                            </td>
                                            <td className='px-4 py-4'>
                                                <span className='rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c8102e]'>
                                                    {school.mouStatus}
                                                </span>
                                            </td>
                                            <td className='px-4 py-4 text-zinc-600'>
                                                {school.updated}
                                            </td>
                                            <td className='px-4 py-4'>
                                                <div className='flex justify-end gap-2'>
                                                    <Link
                                                        href={`/schools/${school.id}`}
                                                        className='inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]'
                                                    >
                                                        View School
                                                    </Link>

                                                    <form action={unassignSchoolFromUser.bind(null,profile.id,school.id)}>
                                                        <button
                                                            type="submit"
                                                            className='inline-flex h-8 items-center rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-[#c8102e] hover:bg-red-50'
                                                        >
                                                            Unassign
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {assignedSchools.length === 0 ? (
                            <div className='mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500'>
                                No schools assigned to this user yet.
                            </div>
                        ) : null}
                    </section>
                </div>
            </section>
        </main>
    );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';
import { updateSchool } from './actions';

const states = [
    "Arizona",
    "California",
    "Colorado",
    "Florida",
    "Idaho",
    "Illinois",
    "Iowa",
    "Massachusetts",
    "Nevada",
    "New Mexico",
    "New York",
    "Oregon",
    "Texas",
    "Utah",
    "Washington",
];

type EditSchoolPageProps ={
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        error?:string;
    }>;
};

export default async function EditSchoolPage({
    params,
    searchParams,
}: EditSchoolPageProps) {
    const { id } = await params;
    const { error } = await searchParams;

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
            district_id,
            assigned_rpm_id,
            status,
            mou_status
            `)
        .eq("id",id)
        .maybeSingle();
    
    if (!school) {
        redirect("/schools");
    }

    const { data: districts } = await supabase
        .from("districts")
        .select("id,name")
        .order("name", { ascending: true });
    
    const { data: rpms } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name", { ascending: true });
    
    const updateSchoolById = updateSchool.bind(null, school.id);

    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='ml-64 min-h-screen px-8 py-6'>
                <div className='mx-auto max-w-5xl'>
                    <Link
                        href={`/schools/${school.id}`}
                        className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                    >
                        Back to {school.name}
                    </Link>

                    <section className='mt-5 rounded-lg border border-red-100 bg-white p-6 shadow-sm'>
                        <div className='mb-6'>
                            <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                                Edit School
                            </p>
                            <h1 className='mt-2 text-3xl font-semibold'>{school.name}</h1>
                            <p className='mt-1 text-sm text-zinc-600'>
                                Update this school profile.
                            </p>
                        </div>

                        {error ? (
                            <div className='mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                                {error === 'missing-fields'
                                    ? "School name, state, status, and MOU status are required."
                                    : "Something went wrong. Please try again."
                                }
                            </div>
                        ) : null}

                        <form action={updateSchoolById} className='space-y-6'>
                            <div className='grid gap-5 sm:grid-cols-2'>
                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        School Name
                                    </span>
                                    <input
                                        name="name"
                                        required
                                        defaultValue={school.name}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    />
                                </label>

                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        Year LIA Started
                                    </span>
                                    <input
                                        name="year_lia_started"
                                        type="number"
                                        min="2001"
                                        max="2100"
                                        defaultValue={school.year_lia_started ?? ""}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    />
                                </label>
                            </div>

                            <div className='grid gap-5 sm:grid-cols-3'>
                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        Address
                                    </span>
                                    <input
                                        name = "address"
                                        defaultValue={school.address ?? ""}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    />
                                </label>

                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        State
                                    </span>
                                    <select 
                                        name="state"
                                        required
                                        defaultValue={school.state}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    >
                                        <option value="">Select State</option>
                                        {states.map((state) => (
                                            <option key={state} value={state}>
                                                {state}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        Region
                                    </span>
                                    <select
                                        name="region"
                                        defaultValue={school.region ?? ""}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    >
                                        <option value="">N/A</option>
                                        <option value="North">North</option>
                                        <option value="South">South</option>
                                        <option value="East">East</option>
                                        <option value="West">West</option>
                                    </select>
                                </label>
                            </div>

                            <div className='grid gap-5 sm:grid-cols-2'>
                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        District
                                    </span>
                                    <select
                                        name="district_id"
                                        defaultValue={school.district_id ?? ""}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    >
                                        <option value="">No district selected</option>
                                        {districts?.map((district) => (
                                            <option key={district.id} value={district.id}>
                                                {district.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        Assigned RPM
                                    </span>
                                    <select
                                        name="assigned_rpm_id"
                                        defaultValue={school.assigned_rpm_id ?? ""}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    >
                                        <option value="">Unassigned</option>
                                        {rpms?.map((rpm) => (
                                            <option key={rpm.id} value={rpm.id}>
                                                {rpm.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className='grid gap-5 sm:grid-cols-2'>
                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        Status
                                    </span>
                                    <select
                                        name="status"
                                        required
                                        defaultValue={school.status}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="interested">Interested</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </label>

                                <label className='block'>
                                    <span className='text-sm font-medium text-zinc-800'>
                                        MOU Status
                                    </span>
                                    <select
                                        name="mou_status"
                                        required
                                        defaultValue={school.mou_status}
                                        className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus-red-100'
                                    >
                                        <option value="signed">Signed</option>
                                        <option value="pending">Pending</option>
                                        <option value="not signed">Not Signed</option>
                                    </select>
                                </label>
                            </div>

                            <div className='flex justify-end gap-3 border-t border-zinc-100 pt-5'>
                                <Link
                                    href={`/schools/${school.id}`}
                                    className='rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]'
                                >
                                    Cancel
                                </Link>

                                <button
                                    type="submit"
                                    className='rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a70d25]'
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </section>
        </main>
    );
}

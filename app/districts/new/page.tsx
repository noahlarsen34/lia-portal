import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';
import { createDistrict } from './actions';

const states = [
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Florida",
    "Idaho",
    "Illinois",
    "Iowa",
    "Massachusetts",
    "Nevada",
    "New Mexico",
    "New York",
    "Oregon",
    "Tennessee",
    "Texas",
    "Utah",
    "Washington",
];

type AddDistrictPageProps = {
    searchParams: Promise <{
        state?: string;
        error?: string;
        returnTo?: string;
    }>;
};

export default async function AddDistrictPage({
    searchParams,
}: AddDistrictPageProps) {
    const { state, error, returnTo } = await searchParams;
    const supabase = await createClient();
    const shouldReturnToDistricts = returnTo === "districts";
    const backHref = shouldReturnToDistricts ? "/districts" : "/schools/new";
    const backText = shouldReturnToDistricts
        ? "Back to Districts"
        : "Back to Add School";

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
    
    if (profile?.role !== "admin") {
        redirect("/dashboard");
    }

    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8'>
                <div className='mx-auto max-w-3xl'>
                    <Link
                        href={backHref}
                        className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                    >
                        {backText}
                    </Link>

                    <section className='mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6'>
                        <div className='mb-6'>
                            <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                                Add District
                            </p>
                            <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>
                                Create District
                            </h1>
                            <p className='mt-1 text-sm text-zinc-600'>
                                Add a district so it can be selected on school profiles.
                            </p>
                        </div>

                        {error ? (
                            <div className='mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                                {error==="missing-fields"
                                    ? "District name and state are required."
                                    : "That district may already exist for this state."
                                }
                            </div>
                        ) : null}

                        <form action={createDistrict} className='space-y-5'>
                            <input
                                name="return_to"
                                type="hidden"
                                value={shouldReturnToDistricts ? "districts" : "schools-new"}
                            />

                            <label className='block min-w-0'>
                                <span className='text-sm font-medium text-zinc-800'>
                                    District Name
                                </span>
                                <input
                                    name="name"
                                    required
                                    className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                />
                            </label>

                            <label className='block min-w-0'>
                                <span className='text-sm font-medium text-zinc-800'>
                                    State
                                </span>
                                <select
                                    name="state"
                                    required
                                    defaultValue={state ?? ""}
                                    className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                                >
                                    <option value="">Select state</option>
                                    {states.map((stateName) => (
                                        <option key={stateName} value={stateName}>
                                            {stateName}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className='flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end'>
                                <Link
                                    href={backHref}
                                    className='inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto'
                                >
                                    Cancel
                                </Link>

                                <button
                                    type="submit"
                                    className='inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto'
                                >
                                    Save District
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </section>
        </main>
    );
}

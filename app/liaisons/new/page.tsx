import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireAdmin } from "@/utils/role-guards";
import { createDistrictLiaison } from "../actions";

const errorMessages: Record<string, string> = {
    "missing-fields": "Enter a first name, last name, valid email, and select at least one district.",
    "invalid-district": "One or more selected districts are no longer available.",
    "email-exists": "A district liaison already uses this email address.",
    "create-failed": "The liaison could not be created. Please try again.",
};

export default async function NewLiaisonPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const { error } = await searchParams;
    const { supabase } = await requireAdmin();
    const { data: districts } = await supabase
        .from("districts")
        .select("id, name, state")
        .order("state", { ascending: true })
        .order("name", { ascending: true });

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />
            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-3xl">
                    <Link href="/liaisons" className="text-sm font-semibold text-[#c8102e]">
                        ← Back to District Liaisons
                    </Link>
                    <section className="mt-5 rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-7">
                        <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                            District Liaisons
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold">Create Liaison</h1>
                        <p className="mt-2 text-sm text-zinc-600">
                            Create the liaison record and choose every district they should access.
                            You can send the activation invitation after saving.
                        </p>

                        {error ? (
                            <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {errorMessages[error] ?? errorMessages["create-failed"]}
                            </div>
                        ) : null}

                        <form action={createDistrictLiaison} className="mt-6 space-y-6">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <label className="block">
                                    <span className="text-sm font-medium text-zinc-800">First name</span>
                                    <input name="first_name" required className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100" />
                                </label>
                                <label className="block">
                                    <span className="text-sm font-medium text-zinc-800">Last name</span>
                                    <input name="last_name" required className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100" />
                                </label>
                            </div>
                            <label className="block">
                                <span className="text-sm font-medium text-zinc-800">Email address</span>
                                <input name="email" type="email" required className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100" />
                            </label>
                            <fieldset>
                                <legend className="text-sm font-semibold text-zinc-900">Assigned districts</legend>
                                <p className="mt-1 text-xs text-zinc-500">Select at least one district. Multiple districts are supported.</p>
                                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-3">
                                    {(districts ?? []).map((district) => (
                                        <label key={district.id} className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 hover:bg-red-50">
                                            <input type="checkbox" name="district_ids" value={district.id} className="mt-0.5 h-4 w-4 accent-[#c8102e]" />
                                            <span className="text-sm"><span className="font-medium">{district.name}</span>{district.state ? <span className="text-zinc-500"> · {district.state}</span> : null}</span>
                                        </label>
                                    ))}
                                    {!districts?.length ? <p className="p-3 text-sm text-zinc-500">Create a district before adding a liaison.</p> : null}
                                </div>
                            </fieldset>
                            <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                                <Link href="/liaisons" className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-semibold text-zinc-700">Cancel</Link>
                                <button type="submit" disabled={!districts?.length} className="inline-flex h-10 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50">Create Liaison</button>
                            </div>
                        </form>
                    </section>
                </div>
            </section>
        </main>
    );
}

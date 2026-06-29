import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from '@/utils/supabase/server';
import { createGeneralContact } from "./actions";

type NewContactPageProps = {
    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function NewContactPage({ searchParams }: NewContactPageProps) {
    const { error } = await searchParams;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profile?.role !== "admin") {
        redirect("/contacts?error=not-authorized");
    }

    const { data: schools } = await supabase
        .from("schools")
        .select("id, name, state")
        .order("name", {ascending: true});
    
    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <Link
                        href="/contacts"
                        className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to Contacts
                    </Link>

                    <section className="mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
                        <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                            Add Contact
                        </p>

                        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                            Create Contact Record
                        </h1>

                        <p className="mt-2 text-sm text-zinc-600">
                            Add a sponsor, partner, district contact, or other important contact.
                        </p>

                        {error ? (
                            <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error === "missing-fields"
                                    ? "First name, last name, and role are required."
                                    : "Could not create contact. Please try again."}
                            </p>
                        ) : null}

                        <form action={createGeneralContact} className="mt-6 space-y-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="min-w-0 text-sm font-medium text-zinc-700">
                                  First Name *
                                <input
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                    name="first_name"
                                    required
                                    type="text"
                                />
                                </label>

                                <label className="min-w-0 text-sm font-medium text-zinc-700">
                                    Last Name *
                                    <input
                                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        name="last_name"
                                        required
                                        type="text"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="min-w-0 text-sm font-medium text-zinc-700">
                                    Role *
                                    <input
                                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        name="role"
                                        placeholder="Sponsor, Partner..."
                                        required
                                        type="text"
                                    />
                                </label>

                                <label className="min-w-0 text-sm font-medium text-zinc-700">
                                    Status
                                    <select
                                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        name="status"
                                        defaultValue="active"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="min-w-0 text-sm font-medium text-zinc-700">
                                    Email
                                    <input
                                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        name="email"
                                        type="email"
                                    />
                                </label>

                                <label className="min-w-0 text-sm font-medium text-zinc-700">
                                    Phone
                                    <input
                                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                        name="phone"
                                        type="text"
                                    />
                                </label>
                            </div>

                            <label className="block min-w-0 text-sm font-medium text-zinc-700">
                                Related School
                                <select
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                    name="school_id"
                                    defaultValue=""
                                >
                                    <option value="">General contact / Not tied to a school</option>
                                    {schools?.map((school) => (
                                        <option key={school.id} value={school.id}>
                                            {school.name}
                                            {school.state ? ` (${school.state})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block min-w-0 text-sm font-medium text-zinc-700">
                                Notes
                                <textarea
                                    className="mt-2 min-h-28 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-2 focus:ring-red-100"
                                    name="notes"
                                />
                            </label>

                            <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                                <Link
                                    href='/contacts'
                                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:w-auto"
                                >
                                    Cancel
                                </Link>

                                <button
                                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white transition hover:bg-[#a70d25] sm:w-auto"
                                    type="submit"
                                >
                                    Save Contact
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </section>
        </main>
    );
}

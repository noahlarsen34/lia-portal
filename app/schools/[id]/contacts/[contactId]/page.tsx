import Link from "next/link";
import { notFound, redirect } from 'next/navigation';
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from '@/utils/supabase/server';

type ContactPageProps = {
    params: Promise<{
        id:string;
        contactId: string;
    }>;
};

export default async function ContactPage({ params }: ContactPageProps) {
    const { id, contactId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: school } = await supabase
        .from("schools")
        .select("id, name")
        .eq("id", id)
        .single();
    
    const { data: contact } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, name, role, email, phone, status, notes")
        .eq("id", contactId)
        .eq("school_id", id)
        .single();

    if (!school || !contact) {
        notFound();
    }

    const displayName = 
        `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
        contact.name;
    
    return (
        <main className="flex min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="flex-1 px-8 py-8">
                <div className="mx-auto w-full max-w-3xl">
                    <Link
                        href={`/schools/${school.id}`}
                        className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to {school.name}
                    </Link>

                    <section className="mt-6 rounded-lg border border-red-100 bg-white p-8 shadow-sm">
                        <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                            Contact Profile
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                            <h1 className="text-3xl font-semibold">{displayName}</h1>
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700">
                                {contact.status}
                            </span>
                        </div>

                        <div className="mt-8 grid gap-6 border-t border-zinc-100 pt-6 md:grid-cols-2">
                            <div>
                                <p className="text-sm uppercase text-zinc-500">First Name</p>
                                <p className="mt-1 font-semibold">
                                    {contact.first_name || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm uppercase text-zinc-500">Last Name</p>
                                <p className="mt-1 font-semibold">
                                    {contact.last_name || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm uppercase text-zinc-500">Role</p>
                                <p className="mt-1 font-semibold">{contact.role}</p>
                            </div>

                            <div>
                                <p className="text-sm uppercase text-zinc-500">Status</p>
                                <p className="mt-1 font-semibold capitalize">
                                    {contact.status}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm uppercase text-zinc-500">Email</p>
                                <p className="mt-1 font-semibold">
                                    {contact.email || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm uppercase text-zinc-500">Phone</p>
                                <p className="mt-1 font-semibold">
                                    {contact.phone || "N/A"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-zinc-100 pt-6">
                            <p className="text-sm uppercase text-zinc-500">Notes</p>
                            <p className="mt-2 text-zinc-700">
                                {contact.notes || "No notes yet."}
                            </p>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 border-t border-zinc-100 pt-6">
                            <Link
                                href={`/schools/${school.id}`}
                                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-red-50"
                            >
                                Back
                                </Link>
                            
                            <Link
                                href={`/schools/${school.id}/contacts/${contact.id}/edit`}
                                className="rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a70d25]"
                            >
                                Edit Contact
                            </Link>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );

}

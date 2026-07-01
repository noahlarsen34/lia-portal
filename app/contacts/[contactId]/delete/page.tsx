import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireAdmin } from "@/utils/role-guards";
import { deleteMainContact } from "./actions";

type DeleteMainContactPageProps = {
    params: Promise<{ contactId: string }>;
    searchParams: Promise<{ error?: string }>;
};

export default async function DeleteMainContactPage({
    params,
    searchParams,
}: DeleteMainContactPageProps) {
    const { contactId } = await params;
    const { error } = await searchParams;
    const { supabase } = await requireAdmin("/contacts");

    const { data: contact } = await supabase
        .from("contacts")
        .select("id, name, first_name, last_name, role, email")
        .eq("id", contactId)
        .maybeSingle();

    if (!contact) {
        redirect("/contacts");
    }

    const deleteContactWithId = deleteMainContact.bind(null, contact.id);
    const contactDisplayName =
        `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
        contact.name ||
        "this contact";

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-3xl">
                    <Link
                        href="/contacts"
                        className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to Contacts
                    </Link>

                    <section className="mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
                        <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                            Delete Contact
                        </p>
                        <h1 className="mt-2 break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">
                            Delete {contactDisplayName}?
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-zinc-600">
                            This will permanently remove this contact record from the
                            portal.
                        </p>

                        {error ? (
                            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                Something went wrong while deleting this contact.
                            </div>
                        ) : (
                            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                This action cannot be undone.
                            </div>
                        )}

                        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                            <Link
                                href="/contacts"
                                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto"
                            >
                                Cancel
                            </Link>
                            <form action={deleteContactWithId} className="w-full sm:w-auto">
                                <button
                                    type="submit"
                                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                                >
                                    Delete Contact
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}

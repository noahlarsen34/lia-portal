import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { uploadDocument } from "./actions";

type AddDocumentPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function AddDocumentPage({ params }: AddDocumentPageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: school } = await supabase
        .from("schools")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();
    
    if (!school) {
        redirect('/schools');
    }

    const uploadDocumentForSchool = uploadDocument.bind(null, school.id);
    
    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8'>
                <div className="mx-auto max-w-3xl">
                    <Link
                        href={`/schools/${school.id}`}
                        className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to {school.name}
                    </Link>

                    <section className="mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
                        <div className="mb-6">
                            <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                                Upload Document
                            </p>
                            <h1 className="mt-2 break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">{school.name}</h1>
                            <p className="mt-1 text-sm text-zinc-600">
                                Add an MOU, agreement, teacher list, or other school document.
                            </p>
                        </div>

                        <form action={uploadDocumentForSchool} className="space-y-5">
                            <label className="block min-w-0">
                                <span className="text-sm font-medium text-zinc-800">
                                    Document Name
                                </span>
                                <input
                                    name="name"
                                    required
                                    placeholder="LIA MOU - Signed"
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                />
                            </label>

                            <label className="block min-w-0">
                                <span className="text-sm font-medium text-zinc-800">
                                    Document Type
                                </span>
                                <select
                                    name="document_type"
                                    required
                                    defaultValue=""
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                >
                                    <option value="" disabled>
                                        Select document type
                                    </option>
                                    <option value="MOU">MOU</option>
                                    <option value="Agreement">Agreement</option>
                                    <option value="Teacher List">Teacher List</option>
                                    <option value="School Profile Form">School Profile Form</option>
                                    <option value="Other">Other</option>
                                </select>
                            </label>

                            <label className="block min-w-0">
                                <span className="text-sm font-medium text-zinc-800">
                                    File
                                </span>
                                <input
                                    name="file"
                                    type="file"
                                    required
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
                                    className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[#c8102e] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#a70d25] focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                />
                            </label>

                            <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                                <Link
                                    href={`/schools/${school.id}`}
                                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto"
                                >
                                    Cancel
                                </Link>

                                <button
                                    type="submit"
                                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                                >
                                    Upload Document
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </section>
        </main>
    );
}

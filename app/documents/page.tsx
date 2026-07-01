import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { DocumentsTable } from "./documents-table";

export default async function DocumentsPage() {
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

    const { data: documents, error: documentsError } = await supabase
        .from("documents")
        .select("id, school_id, name, document_type, file_url, created_at")
        .order("created_at", { ascending: false });

    const { data: schoolRows } = await supabase
        .from("schools")
        .select("id, name, state, district_id, assigned_rpm_id");

    const { data: districtRows } = await supabase
        .from("districts")
        .select("id, name");

    const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name");

    const schoolsById = new Map(
        schoolRows?.map((school) => [school.id, school]) ?? [],
    );

    const districtsById = new Map(
        districtRows?.map((district) => [district.id, district.name]) ?? [],
    );

    const profilesById = new Map(
        profileRows?.map((profile) => [profile.id, profile.full_name]) ?? [],
    );

    const supabaseAdmin = createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );

    const documentRows = await Promise.all(
        (documents ?? []).map(async (document) => {
            const school = schoolsById.get(document.school_id);
            let signedUrl: string | null = null;

            if (document.file_url) {
                const { data } = await supabaseAdmin.storage
                    .from("school-documents")
                    .createSignedUrl(document.file_url, 60 * 10);

                signedUrl = data?.signedUrl ?? null;
            }

            return {
                id: document.id,
                schoolId: document.school_id,
                name: document.name,
                documentType: document.document_type ?? "N/A",
                uploadedAt: document.created_at
                    ? new Date(document.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })
                    : "N/A",
                schoolName: school?.name ?? "N/A",
                state: school?.state ?? "N/A",
                district: school?.district_id
                    ? districtsById.get(school.district_id) ?? "N/A"
                    : "N/A",
                rpm: school?.assigned_rpm_id
                    ? profilesById.get(school.assigned_rpm_id) ?? "Unassigned"
                    : "Unassigned",
                signedUrl,
            };
        }),
    );

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto w-full max-w-7xl">
                    <header className="mb-8">
                        <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                            Documents Database
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold">Documents</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            View and search uploaded school documents across accessible schools.
                        </p>
                    </header>

                    <section className="overflow-hidden rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
                        <DocumentsTable
                            documents={documentRows}
                            userRole={profile?.role ?? "rpm"}
                        />

                        {documentsError ? (
                            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                Could not load documents: {documentsError.message}
                            </p>
                        ) : null}

                        {!documentsError && documentRows.length === 0 ? (
                            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                                No documents uploaded yet.
                            </div>
                        ) : null}
                    </section>
                </div>
            </section>
        </main>
    );
}

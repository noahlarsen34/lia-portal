import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireAdmin } from "@/utils/role-guards";
import { LiaisonsTable } from "./liaisons-table";

type LiaisonsPageProps = {
    searchParams: Promise<{ error?: string }>;
};

export default async function LiaisonsPage({ searchParams }: LiaisonsPageProps) {
    const { error } = await searchParams;
    const { supabase } = await requireAdmin();
    const [{ data: liaisons }, { data: assignments }, { data: districts }] =
        await Promise.all([
            supabase
                .from("district_liaisons")
                .select("id, first_name, last_name, email, status, portal_access_status")
                .order("last_name", { ascending: true })
                .order("first_name", { ascending: true }),
            supabase
                .from("district_liaison_districts")
                .select("liaison_id, district_id"),
            supabase.from("districts").select("id, name"),
        ]);

    const districtNames = new Map(
        (districts ?? []).map((district) => [district.id, district.name]),
    );
    const districtNamesByLiaison = new Map<string, string[]>();
    for (const assignment of assignments ?? []) {
        const name = districtNames.get(assignment.district_id);
        if (!name) continue;
        const names = districtNamesByLiaison.get(assignment.liaison_id) ?? [];
        names.push(name);
        districtNamesByLiaison.set(assignment.liaison_id, names);
    }

    const rows = (liaisons ?? []).map((liaison) => ({
        id: liaison.id,
        name:
            `${liaison.first_name ?? ""} ${liaison.last_name ?? ""}`.trim() ||
            "Unnamed liaison",
        email: liaison.email,
        status: liaison.status,
        portalAccessStatus: liaison.portal_access_status,
        districts: (districtNamesByLiaison.get(liaison.id) ?? []).sort(),
    }));

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />
            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto w-full max-w-6xl">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                                District Liaisons
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold">Liaison Manager</h1>
                            <p className="mt-1 text-sm text-zinc-600">
                                Create liaison accounts and control their district assignments.
                            </p>
                        </div>
                        <Link
                            href="/liaisons/new"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Add District Liaison
                        </Link>
                    </header>

                    {error ? (
                        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            The district liaison could not be found.
                        </div>
                    ) : null}

                    <LiaisonsTable liaisons={rows} />
                </div>
            </section>
        </main>
    );
}

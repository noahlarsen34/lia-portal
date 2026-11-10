import Link from "next/link";
import { School } from "lucide-react";
import { requireDistrictLiaison } from "@/utils/role-guards";

export default async function LiaisonDashboardPage() {
    const { supabase, profile, liaison } = await requireDistrictLiaison();
    const { data: assignments } = await supabase
        .from("district_liaison_districts")
        .select("district_id, districts(name)")
        .eq("liaison_id", liaison.id)
        .order("assigned_at", { ascending: true });

    return (
        <div className="mx-auto max-w-6xl">
            <header className="mb-6 rounded-md border border-red-100 bg-white px-6 py-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    District Liaison Portal
                </p>
                <h1 className="mt-2 text-3xl font-semibold">
                    Welcome, {profile.full_name ?? "District Liaison"}
                </h1>
                <p className="mt-2 max-w-2xl text-zinc-600">
                    View the LIA schools and classes in your assigned district
                    {assignments?.length === 1 ? "" : "s"}.
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Assigned districts</h2>
                    {assignments?.length ? (
                        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                            {assignments.map((assignment) => (
                                <li
                                    key={assignment.district_id}
                                    className="rounded-md border border-zinc-200 px-4 py-3"
                                >
                                    {Array.isArray(assignment.districts)
                                        ? assignment.districts[0]?.name ?? "Assigned district"
                                        : "Assigned district"}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm text-zinc-600">
                            No districts are assigned yet. Contact an LIA administrator.
                        </p>
                    )}
                </section>

                <Link
                    href="/liaison/classes"
                    className="group rounded-md border border-red-100 bg-white p-6 shadow-sm transition hover:border-red-200 hover:shadow-md"
                >
                    <School className="h-9 w-9 text-[#c4122f]" aria-hidden />
                    <h2 className="mt-5 text-lg font-semibold">District Classes</h2>
                    <p className="mt-2 text-sm text-zinc-600">
                        Open the district classes workspace. School grouping and class
                        access will be added in the next milestone.
                    </p>
                    <p className="mt-5 text-sm font-semibold text-[#c4122f]">
                        Open District Classes →
                    </p>
                </Link>
            </div>
        </div>
    );
}

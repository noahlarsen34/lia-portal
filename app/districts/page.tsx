import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { DistrictsTable } from "./districts-table";

export default async function DistrictsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: districts } = await supabase
    .from("districts")
    .select("id, name, state")
    .order("state", { ascending: true })
    .order("name", { ascending: true });

  const districtRows = districts ?? [];

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />

      <section className="ml-64 min-h-screen px-8 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                Districts
              </p>
              <h1 className="mt-2 text-3xl font-semibold">District Manager</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Edit district names and clean up duplicate or misspelled entries.
              </p>
            </div>

            <Link
              href="/districts/new?returnTo=districts"
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
            >
              Add District
            </Link>
          </div>

          <DistrictsTable districts={districtRows} />
        </div>
      </section>
    </main>
  );
}

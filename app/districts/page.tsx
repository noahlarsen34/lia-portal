import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";

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

          <section className="mt-6 rounded-lg border border-red-100 bg-white p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
                    <th className="px-4 py-3 font-semibold">District Name</th>
                    <th className="px-4 py-3 font-semibold">State</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {districtRows.map((district) => (
                    <tr
                      key={district.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-4 py-4 font-semibold">
                        {district.name}
                      </td>
                      <td className="px-4 py-4 text-zinc-600">
                        {district.state ?? "N/A"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/districts/${district.id}/edit`}
                            className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/districts/${district.id}/delete`}
                            className="inline-flex h-8 items-center rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-[#c8102e] hover:bg-red-50"
                          >
                            Delete
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {districtRows.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No districts added yet.
              </p>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { deleteDistrict } from "./actions";

type DeleteDistrictPageProps = {
  params: Promise<{
    districtId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function DeleteDistrictPage({
  params,
  searchParams,
}: DeleteDistrictPageProps) {
  const { districtId } = await params;
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
  
  if (profile?.role !=="admin") {
    redirect("/dashboard");
  }

  const { data: district } = await supabase
    .from("districts")
    .select("id, name, state")
    .eq("id", districtId)
    .maybeSingle();

  if (!district) {
    redirect("/districts");
  }

  const { count } = await supabase
    .from("schools")
    .select("id", { count: "exact", head: true })
    .eq("district_id", district.id);

  const connectedSchoolCount = count ?? 0;
  const canDelete = connectedSchoolCount === 0;
  const deleteDistrictById = deleteDistrict.bind(null, district.id);

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />

      <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/districts"
            className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
          >
            Back to Districts
          </Link>

          <section className="mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                Delete District
              </p>
              <h1 className="mt-2 break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">
                Delete {district.name}?
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {district.state ?? "No state listed"}
              </p>
            </div>

            {canDelete ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                This action cannot be undone.
              </div>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This district is connected to {connectedSchoolCount} school
                {connectedSchoolCount === 1 ? "" : "s"}. Edit the district
                name instead, or move those schools to another district before
                deleting it.
              </div>
            )}

            {error ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error === "district-in-use"
                  ? "This district is still connected to schools."
                  : "Something went wrong. Please try again."}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/districts"
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto"
              >
                Cancel
              </Link>

              {canDelete ? (
                <form action={deleteDistrictById} className="w-full sm:w-auto">
                  <button
                    type="submit"
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                  >
                    Delete District
                  </button>
                </form>
              ) : (
                <Link
                  href={`/districts/${district.id}/edit`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                >
                  Edit District
                </Link>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

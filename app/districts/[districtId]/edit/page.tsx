import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { updateDistrict } from "./actions";

const states = [
  "Arizona",
  "California",
  "Colorado",
  "Connecticut",
  "Florida",
  "Idaho",
  "Illinois",
  "Iowa",
  "Massachusetts",
  "Nevada",
  "New Mexico",
  "New York",
  "Oregon",
  "Tennessee",
  "Texas",
  "Utah",
  "Washington",
];

type EditDistrictPageProps = {
  params: Promise<{
    districtId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditDistrictPage({
  params,
  searchParams,
}: EditDistrictPageProps) {
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

  const updateDistrictById = updateDistrict.bind(null, district.id);

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />

      <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
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
                Edit District
              </p>
              <h1 className="mt-2 break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">{district.name}</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Rename a district or move it to the correct state.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error === "missing-fields"
                  ? "District name and state are required."
                  : "That district may already exist for this state."}
              </div>
            ) : null}

            <form action={updateDistrictById} className="space-y-5">
              <label className="block min-w-0">
                <span className="text-sm font-medium text-zinc-800">
                  District Name
                </span>
                <input
                  name="name"
                  required
                  defaultValue={district.name}
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-medium text-zinc-800">
                  State
                </span>
                <select
                  name="state"
                  required
                  defaultValue={district.state ?? ""}
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                >
                  <option value="">Select state</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                <Link
                  href="/districts"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

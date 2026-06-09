import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { updateActivity } from "./actions";

type EditActivityPageProps = {
  params: Promise<{
    id: string;
    activityId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditActivityPage({
  params,
  searchParams,
}: EditActivityPageProps) {
  const { id, activityId } = await params;
  const { error } = await searchParams;

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
    .maybeSingle();

  if (!school) {
    redirect("/schools");
  }

  const { data: activity } = await supabase
    .from(
      "activities",
    )
    .select(
      "id, interaction_type, contact_person, notes, activity_date, follow_up_date",
    )
    .eq("id", activityId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (!activity) {
    redirect(`/schools/${school.id}`);
  }

  const updateActivityForSchool = updateActivity.bind(
    null,
    school.id,
    activity.id,
  );

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />

      <section className="ml-64 min-h-screen px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/schools/${school.id}`}
            className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
          >
            Back to {school.name}
          </Link>

          <section className="mt-5 rounded-lg border border-red-100 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                Edit Activity
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                {activity.interaction_type}
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Update this activity log entry.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error === "missing-fields"
                  ? "Interaction type, activity date, and notes are required."
                  : "Something went wrong. Please try again."}
              </div>
            ) : null}

            <form action={updateActivityForSchool} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-800">
                    Interaction Type
                  </span>
                  <select
                    name="interaction_type"
                    required
                    defaultValue={activity.interaction_type}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  >
                    <option value="">Select type</option>
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Visit">Visit</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800">
                    Activity Date
                  </span>
                  <input
                    name="activity_date"
                    type="date"
                    required
                    defaultValue={activity.activity_date}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-800">
                    Contact Person
                  </span>
                  <input
                    name="contact_person"
                    defaultValue={activity.contact_person ?? ""}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-800">
                    Follow-Up Date
                  </span>
                  <input
                    name="follow_up_date"
                    type="date"
                    defaultValue={activity.follow_up_date ?? ""}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-zinc-800">
                  Notes
                </span>
                <textarea
                  name="notes"
                  rows={5}
                  required
                  defaultValue={activity.notes ?? ""}
                  className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5">
                <Link
                  href={`/schools/${school.id}`}
                  className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a70d25]"
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
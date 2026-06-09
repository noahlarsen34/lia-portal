import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/utils/supabase/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.email ?? "Admin";

  const { count: totalSchools } = await supabase
    .from("schools")
    .select("*", { count: "exact", head: true });

  const { count: activeSchools } = await supabase
    .from("schools")
    .select("*", {count: "exact", head: true})
    .eq("status", "active");

  const { count: inactiveSchools } = await supabase
    .from("schools")
    .select("*", {count: "exact", head: true})
    .eq("status", "inactive");
  
  const { count: mouSignedSchools } = await supabase
    .from("schools")
    .select("*", {count: "exact", head: true})
    .eq("mou_status", "signed");

  const dashboardStats = [
    {
      label: "Total Schools",
      value: totalSchools ?? 0,
      detail: "All time",
    },
    {
      label: "Active Schools",
      value: activeSchools ?? 0,
      detail: "Currently Active",
    },
    {
      label: "Inactive Schools",
      value: inactiveSchools ?? 0,
      detail: "Needs review",
    },
    {
      label: "MOU Signed",
      value: mouSignedSchools ?? 0,
      detail: "Signed schools",
    },
    {
      label: "Assigned RPMs",
      value: 1,
      detail: "Active"
    },
  ];

  const { data: schoolRows } = await supabase
    .from("schools")
    .select(`
      id,
      name,
      state,
      region,
      district_id,
      assigned_rpm_id,
      status,
      mou_status,
      updated_at
    `)
    .order("updated_at", { ascending: false })
    .limit(10);

  const { data: districtRows } = await supabase
    .from("districts")
    .select("id, name");

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, full_name");

  const districtsById = new Map(
    districtRows?.map((district) => [district.id, district.name]) ?? [],
  );

  const profilesById = new Map(
    profileRows?.map((profile) => [profile.id, profile.full_name]) ?? [],
  );
  
  const dashboardSchools =
    schoolRows?.map((school) => ({
      id: school.id,
      name: school.name,
      state: school.state,
      region: school.region ?? "N/A",
      district: school.district_id
        ? districtsById.get(school.district_id) ?? "N/A"
        : "N/A",
      rpm: school.assigned_rpm_id
        ? profilesById.get(school.assigned_rpm_id) ?? "Unassigned"
        : "Unassigned",
      status: school.status,
      mou: school.mou_status,
      updated: new Date(school.updated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    })) ?? [];

  const { data: activityRows } = await supabase
    .from("activities")
    .select(`
      id,
      interaction_type,
      notes,
      activity_date,
      schools(
        name
      )
    `)
    .order("activity_date", {ascending: false})
    .limit(4);
  
  const recentActivities =
    activityRows?.map((activity) => {
      const school = Array.isArray(activity.schools)
        ? activity.schools[0]
        : activity.schools;

      return {
        id: activity.id,
        title: activity.notes,
        school: school?.name ?? "Unknown school",
        type: activity.interaction_type,
        date: new Date(activity.activity_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
    }) ?? [];

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />

      <section className="ml-64 min-h-screen px-8 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              Welcome back, {displayName}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              LIA School Management Dashboard
            </p>
          </div>

          <form action={signOut}>
            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
              type="submit"
            >
              Sign Out
            </button>
          </form>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {dashboardStats.map((stat) =>(
            <div
              key={stat.label}
              className="rounded-lg border border-red-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-zinc-700">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{stat.detail}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <div className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Schools by State</h2>
            <div className="mt-5 flex h-44 items-center justify-center rounded-md bg-red-50 text-sm text-zinc-500">
              Chart placeholder
            </div>
          </div>

          <div className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Schools by RPM</h2>
            <div className="mt-5 space-y-3 text-sm">
              {["Maria Lopez", "Jacob Smith", "Ariel Johnson", "Daniel Kim"].map(
                (rpm, index) => (
                  <div key={rpm}>
                    <div className="mb-1 flex justify-between">
                      <span>{rpm}</span>
                      <span>{32 - index * 4}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div 
                        className="h-2 rounded-full bg-[#c8102e]"
                        style={{width: `${80 - index * 10}%` }}
                      />
                    </div>
                  </div>

                )
              )}
            </div>
          </div>

          <div className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Activities</h2>
              <button className="text-sm font-semibold text-[#c8102e]">
                View all
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              {recentActivities.map((activity) => (
                <div key={activity.id}>
                  <p className="font-semibold">{activity.title}</p>
                  <p className="text-zinc-500">
                    {activity.school} · {activity.date}
                  </p>
                  </div>
              ))}
              </div>
            </div>
        </section>

        <section className="mt-5 rounded-lg border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Schools Database (List View)</h2>
              {/* <p className="text-sm text-zinc-500">List view</p> */}
            </div>

            {/* <button className="w-fit rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white">
              Add School
            </button> */}
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm sm:w-64"
              placeholder="Search schools..."
            />
            <button className="rounded-md border border-zinc-200 px-4 text-sm">
              State
            </button>
            <button className="rounded-md border border-zinc-200 px-4 text-sm">
              Region
            </button>
            <button className="rounded-md border border-zinc-200 px-4 text-sm">
              Status
            </button>
            <button className="rounded-md border border-zinc-200 px-4 text-sm">
              RPM
            </button>
            <button className="rounded-md border border-zinc-200 px-4 text-sm">
              MOU Status
            </button>
            <button className="rounded-md border border-zinc-200 px-4 text-sm">
              Filter
            </button>
            <Link
              href="/schools/new"
              className='w-fit rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a70d25]'
              >
              Add School
            </Link>
          </div>
          
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="px-4 py-3">School Name</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Assigned RPM</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">MOU</th>
                <th className="px-4 py-3">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {dashboardSchools.map((school) => (
                <tr key={school.id} className="border-b border-zinc-100">
                  <td className="px-4 py-4 font-semibold">{school.name}</td>
                  <td className="px-4 py-4">{school.state}</td>
                  <td className="px-4 py-4">{school.region}</td>
                  <td className="px-4 py-4">{school.district}</td>
                  <td className="px-4 py-4">{school.rpm}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                      {school.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]">
                      {school.mou}
                    </span>
                  </td>
                  <td className="px-4 py-4">{school.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
         </div>
        </section>
      </section>
    </main>
  );
}

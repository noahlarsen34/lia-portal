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
  const isAdmin = profile?.role === "admin";

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

  const { data: allSchoolStateRows } = await supabase
    .from("schools")
    .select("state");

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

  const { data: allSchoolRpmRows } = await supabase
    .from("schools")
    .select("assigned_rpm_id");

  const rpmCounts = new Map<string, number>();

  allSchoolRpmRows?.forEach((school) => {
    const rpmName = school.assigned_rpm_id
      ? profilesById.get(school.assigned_rpm_id) ?? "Unknown RPM"
      : "Unassigned";

      rpmCounts.set(rpmName, (rpmCounts.get(rpmName) ?? 0) + 1);
  });

  const schoolsByRpm = Array.from(rpmCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((a,b) => b.count - a.count);

  if (isAdmin) {
    dashboardStats.push({
      label: "Assigned RPMs",
      value: schoolsByRpm.filter((rpm) => rpm.name !== "Unassigned").length,
      detail: "Active",
    });
  }
  
  const maxRpmCount = Math.max(...schoolsByRpm.map((rpm) => rpm.count), 1)
  
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
        name,
        assigned_rpm_id
      )
    `)
    .order("activity_date", {ascending: false})
    .limit(4);
  
  const recentActivities =
    activityRows?.map((activity) => {
      const school = Array.isArray(activity.schools)
        ? activity.schools[0]
        : activity.schools;

      const rpmName = school?.assigned_rpm_id
        ? profilesById.get(school.assigned_rpm_id) ?? "Unkown RPM"
        : "Unassigned";

      return {
        id: activity.id,
        title: activity.notes,
        school: school?.name ?? "Unknown school",
        rpm: rpmName,
        type: activity.interaction_type,
        date: new Date(activity.activity_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
    }) ?? [];
  
  const stateCounts = new Map<string, number>();

  allSchoolStateRows?.forEach((school) => {
    const stateName = school.state || "Unknown";
    stateCounts.set(stateName, (stateCounts.get(stateName) ?? 0) + 1);
  });

  const schoolsByState = Array.from(stateCounts.entries())
    .map(([name,count]) => ({
      name,
      count,
    }))
    .sort((a,b) => b.count - a.count);

  const maxStateCount = Math.max(...schoolsByState.map((state) => state.count), 1);

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />

      <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              Welcome back, {displayName}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              LIA School Management Dashboard
            </p>
          </div>

          <form action={signOut} className="w-full sm:w-auto">
            <button
              className="w-full rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto"
              type="submit"
            >
              Sign Out
            </button>
          </form>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">Schools by State</h2>
              <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-[#c8102e]">
                Top 8
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {schoolsByState.slice(0, 8).map((state) => (
                <div key={state.name}>
                  <div className="mb-1 flex justify-between gap-4">
                    <span className="truncate font-medium text-zinc-700">{state.name}</span>
                    <span className="font-semibold text-zinc-950">{state.count}</span>
                  </div>

                  <div className="h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-2 rounded-full bg-[#c8102e]"
                      style={{
                        width: `${(state.count / maxStateCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              {schoolsByState.length === 0 ? (
                <p className="text-sm text-zinc-500">No school states yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Schools by RPM</h2>

            <div className="mt-5 space-y-3 text-sm">
              {schoolsByRpm.map((rpm) => (
                <div key={rpm.name}>
                  <div className="mb-1 flex justify-between gap-4">
                    <span className="truncate">{rpm.name}</span>
                    <span>{rpm.count}</span>
                  </div>

                  <div className="h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-2 rounded-full bg-[#c8102e]"
                      style={{
                        width: `${(rpm.count / maxRpmCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              {schoolsByRpm.length === 0 ? (
                <p className="text-sm text-zinc-500">No RPM assignments yet.</p>
              ): null}
            </div> 
          </div>

          <div className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Activities</h2>
              <Link
                href="/activity-log"
                className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
              >
                View all
              </Link>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              {recentActivities.map((activity) => (
                <div key={activity.id}>
                  <p className="font-semibold">{activity.title}</p>
                  <p className="text-zinc-500">
                    {activity.school} ·  {activity.rpm} · {activity.date}
                  </p>
                  </div>
              ))}
              </div>
            </div>
        </section>

        <section className="mt-5 rounded-lg border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Schools Database (List View)</h2>
              <p className="mt-1 text-sm text-zinc-500">Recent school records</p>
            </div>

            <Link
              href="/schools"
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
            >
              View All
            </Link>
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
            {isAdmin ? (
              <Link
              href="/schools/new"
              className='w-fit rounded-md bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a70d25]'
              >
              Add School
            </Link>
          ) : null}
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
                  <td className="px-4 py-4 font-semibold">
                    <Link 
                      href={`/schools/${school.id}`}
                      className="text-zinc-950 hover:text-[#c8102e]"
                    >
                      {school.name}
                    </Link>
                  </td>
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

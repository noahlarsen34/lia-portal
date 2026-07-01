import {redirect} from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { ActivityLogTable } from "./activity-log-table";

export default async function ActivityLogPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: activityRows } = await supabase
        .from("activities")
        .select(`
            id,
            interaction_type,
            notes,
            contact_person,
            activity_date,
            follow_up_date,
            schools(
                id,
                name,
                state,
                assigned_rpm_id
            )
        `)
        .order("activity_date", { ascending: false });
    
    const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, full_name");
        
    const profilesById = new Map(
        profileRows?.map((profile) => [profile.id, profile.full_name]) ?? [],
    );

    const activities =
        activityRows?.map((activity) => {
            const school = Array.isArray(activity.schools)
                ? activity.schools[0]
                : activity.schools;
            
            const rpm = school?.assigned_rpm_id
                ? profilesById.get(school.assigned_rpm_id) ?? "Unknown RPM"
                : "Unassigned";
            
            return {
                id: activity.id,
                type: activity.interaction_type,
                notes: activity.notes ?? "No notes listed.",
                contactPerson: activity.contact_person ?? "N/A",
                activityDate: activity.activity_date
                    ? new Date(activity.activity_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })
                    : "N/A",
                followUpDate: activity.follow_up_date
                    ? new Date(activity.follow_up_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })
                    : "N/A",
                schoolId: school?.id ?? null,
                schoolName: school?.name ?? "Unknown school",
                state: school?.state ?? "N/A",
                rpm,
            };
        }) ?? [];

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
                <div className="mx-auto w-full max-w-7xl">
                    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                                Activity Log
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold">Activity Log</h1>
                            <p className="mt-1 text-sm text-zinc-600">
                                Review recent calls, emails, meetings, visits, and follow-ups across schools.
                            </p>
                        </div>
                    </header>

                    <section className="rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
                        <ActivityLogTable activities={activities} />
                    </section>
                </div>
            </section>
        </main>
    );
}
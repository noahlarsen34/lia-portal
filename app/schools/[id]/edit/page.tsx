import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { EditSchoolForm } from "./edit-school-form";

type EditSchoolPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditSchoolPage({
  params,
  searchParams,
}: EditSchoolPageProps) {
  const { id } = await params;
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
    .select(`
      id,
      name,
      year_lia_started,
      address:city,
      state,
      region,
      district_id,
      assigned_rpm_id,
      status,
      mou_status
    `)
    .eq("id", id)
    .maybeSingle();

  if (!school) {
    redirect("/schools");
  }

  const { data: districts } = await supabase
    .from("districts")
    .select("id, name, state")
    .order("name", { ascending: true });

  const { data: rpms } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />

      <section className="ml-64 min-h-screen px-8 py-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/schools/${school.id}`}
            className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
          >
            Back to {school.name}
          </Link>

          <EditSchoolForm
            school={school}
            districts={districts ?? []}
            rpms={rpms ?? []}
            error={error}
          />
        </div>
      </section>
    </main>
  );
}

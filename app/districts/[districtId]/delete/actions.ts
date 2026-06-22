"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

export async function deleteDistrict(districtId: string) {
  const { supabase } = await requireAdmin();

  const { count } = await supabase
    .from("schools")
    .select("id", { count: "exact", head: true })
    .eq("district_id", districtId);

  if ((count ?? 0) > 0) {
    redirect(`/districts/${districtId}/delete?error=district-in-use`);
  }

  const { error } = await supabase
    .from("districts")
    .delete()
    .eq("id", districtId);

  if (error) {
    redirect(`/districts/${districtId}/delete?error=delete-failed`);
  }

  redirect("/districts");
}

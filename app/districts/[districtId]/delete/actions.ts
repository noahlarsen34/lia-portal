"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function deleteDistrict(districtId: string) {
  const supabase = await createClient();

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

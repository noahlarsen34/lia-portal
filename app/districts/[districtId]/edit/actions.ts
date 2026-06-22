"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

export async function updateDistrict(districtId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();

  if (!name || !state) {
    redirect(`/districts/${districtId}/edit?error=missing-fields`);
  }

  const { error } = await supabase
    .from("districts")
    .update({
      name,
      state,
    })
    .eq("id", districtId);

  if (error) {
    redirect(`/districts/${districtId}/edit?error=update-failed`);
  }

  redirect("/districts");
}

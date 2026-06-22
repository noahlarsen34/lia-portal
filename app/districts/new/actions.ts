"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

export async function createDistrict(formData: FormData) {
    const { supabase } = await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const returnTo = String(formData.get("return_to") ?? "").trim();
    const shouldReturnToDistricts = returnTo === "districts";
    const returnQuery = shouldReturnToDistricts ? "&returnTo=districts" : "";

    if (!name || !state) {
        redirect(`/districts/new?error=missing-fields${returnQuery}`);
    }

    const { error } = await supabase.from("districts").insert({
        name,
        state,
    });

    if (error) {
        redirect(`/districts/new?state=${encodeURIComponent(state)}&error=create-failed${returnQuery}`);
    }

    if (shouldReturnToDistricts) {
        redirect("/districts");
    }

    redirect(`/schools/new?state=${encodeURIComponent(state)}`);
}

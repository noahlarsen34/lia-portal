"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

export async function createSchool(formData: FormData) {
    const { supabase, user } = await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const yearLiaStarted = String(formData.get("year_lia_started") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim();
    const districtId = String(formData.get("district_id") ?? "").trim();
    const assignedRpmId = String(formData.get("assigned_rpm_id") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const mouStatus = String(formData.get("mou_status") ?? "pending").trim();

    if (!name || !state || !status || !mouStatus) {
        redirect("/schools/new?error=missing-fields");
    }

    const { data: school, error } = await supabase
        .from("schools")
        .insert({
            name,
            year_lia_started: yearLiaStarted ? Number(yearLiaStarted) : null,
            city: address || null,
            state,
            region: region || null,
            district_id: districtId || null,
            assigned_rpm_id: assignedRpmId || null,
            status,
            mou_status: mouStatus,
            last_updated_by: user?.id ?? null,
        })
        .select('id')
        .single();

    if (error || !school) {
        redirect("/schools/new?error=create-failed");
    }
    redirect(`/schools/${school.id}`);

}

"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function updateSchool(schoolId: string, formData: FormData) {
    const supabase = await createClient();

    const name = String(formData.get("name") ?? "").trim();
    const yearLiaStarted = String(formData.get("year_lia_started") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim();
    const districtId = String(formData.get("district_id") ?? "").trim();
    const assignedRpmId = String(formData.get("assigned_rpm_id") ?? "").trim();
    const schoolLevel = String(formData.get('school_level') ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const mouStatus = String(formData.get("mou_status") ?? "pending").trim();

    if (!name || !state || !status || !mouStatus || !schoolLevel) {
        redirect(`/schools/${schoolId}/edit?error=missing-fields`);
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
        .from("schools")
        .update({
            name,
            year_lia_started: yearLiaStarted ? Number(yearLiaStarted): null,
            city: address || null,
            state,
            region: region || null,
            district_id: districtId || null,
            assigned_rpm_id: assignedRpmId || null,
            school_level: schoolLevel,
            status,
            mou_status: mouStatus,
            last_updated_by: user?.id ?? null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", schoolId);

    if (error) {
        redirect(`/schools/${schoolId}/edit?error=update-failed`);
    }
    redirect(`/schools/${schoolId}`);
}

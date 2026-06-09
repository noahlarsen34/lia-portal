"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function createActivity(schoolId: string, formData: FormData) {
    const supabase = await createClient();

    const interactionType = String(formData.get("interaction_type") ?? "").trim();
    const contactPerson = String(formData.get("contact_person") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const activityDate = String(formData.get("activity_date") ?? "").trim();
    const followUpDate = String(formData.get("follow_up_date") ?? "").trim(); 

    if (!interactionType || !notes || !activityDate) {
        redirect(`/schools/${schoolId}/activities/new?error=missing-fields`);
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("activities").insert({
        school_id: schoolId,
        interaction_type: interactionType,
        contact_person: contactPerson || null,
        notes,
        activity_date: activityDate,
        follow_up_date: followUpDate || null,
        created_by: user?.id ?? null,
    });

    if (error) {
        redirect(`/schools/${schoolId}/activties/new?error=create-failed`);
    }

    redirect(`/schools/${schoolId}`);
}
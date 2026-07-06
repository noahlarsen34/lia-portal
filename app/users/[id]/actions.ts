"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/role-guards";

export async function assignSchoolToUser(userId: string, formData: FormData) {
    const { supabase } = await requireAdmin(`/users/${userId}`);

    const schoolId = String(formData.get("school_id") ?? "").trim();

    if (!schoolId) {
        redirect(`/users/${userId}?error=missing-school`);
    }

    const { error } = await supabase
        .from("schools")
        .update({
            assigned_rpm_id: userId,
        })
        .eq("id",schoolId);
    
    if (error) {
        redirect(`/users/${userId}?error=assign-failed`);
    }

    redirect(`/users/${userId}`);
}

export async function unassignSchoolFromUser(
    userId: string,
    schoolId: string
) {
    const { supabase } = await requireAdmin(`/users/${userId}`);

    const { error } = await supabase
        .from("schools")
        .update({
            assigned_rpm_id: null,
        })
        .eq("id",schoolId)
        .eq("assigned_rpm_id", userId);
    
    if (error) {
        redirect(`/users/${userId}?error=unassign-failed`);
    }

    redirect(`/users/${userId}`);
}

export async function updateUserRole(userId: string, formData: FormData) {
    const { supabase, user } = await requireAdmin(`/users/${userId}`);

    const role = String(formData.get("role") ?? "").trim();

    const validRoles = ["admin", "rpm", "teacher", "student"];

    if (!validRoles.includes(role)) {
        redirect(`/users/${userId}?error=invalid-role`);
    }

    if (user.id === userId && role !== "admin") {
        redirect(`/users/${userId}?error=cannot-change-own-role`);
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            role,
        })
        .eq("id",userId);
    
    if (error) {
        redirect(`/users/${userId}?error=role-update-failed`);
    }
    
    redirect(`/users/${userId}`);
}


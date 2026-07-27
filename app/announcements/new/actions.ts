"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";

export async function createAnnouncement(formData: FormData) {
    const { supabase, profile } = await requireStaff();

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const intent = String(formData.get("intent") ?? "").trim();

    if (!title || !body) {
        redirect("/announcements/new?error=missing-fields");
    }

    if (title.length > 160 || body.length > 10000) {
        redirect("/announcements/new?error=content-too-long");
    }

    const isAdmin = profile.role === "admin";
    const isPublished = intent === "publish";

    const { error } = await supabase.from("announcements").insert({
        author_profile_id: profile.id,
        audience: isAdmin ? "all_teachers" : "rpm_teachers",
        target_rpm_id: isAdmin ? null : profile.id,
        title,
        body,
        status: isPublished ? "published" : 'draft',
        published_at: isPublished ? new Date().toISOString() : null,
    });

    if (error) {
        console.error("Announcement creation failed:", error),
        redirect("/announcements/new?error=create-failed");
    }

    redirect("/announcements?created=true");
}

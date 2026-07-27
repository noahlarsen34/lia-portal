"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";

async function getManageableAnnouncement(announcementId: string) {
    const { supabase, profile } = await requireStaff();

    const { data: announcement, error } = await supabase
        .from("announcements")
        .select("id, author_profile_id, target_rpm_id, status, published_at")
        .eq("id", announcementId)
        .maybeSingle();

    if (error || !announcement) {
        return { supabase, profile, announcement: null };
    }

    const canManage =
        profile.role === "admin" ||
        (profile.role === "rpm" &&
            announcement.author_profile_id === profile.id &&
            announcement.target_rpm_id === profile.id);

    return {
        supabase,
        profile,
        announcement: canManage ? announcement : null,
    };
}

export async function updateAnnouncement(
    announcementId: string,
    formData: FormData,
) {
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const intent = String(formData.get("intent") ?? "save");

    if (!title || !body) {
        redirect(
            `/announcements/${announcementId}/edit?error=missing-fields`,
        );
    }

    if (title.length > 160 || body.length > 10000) {
        redirect(
            `/announcements/${announcementId}/edit?error=content-too-long`,
        );
    }

    const { supabase, announcement } =
        await getManageableAnnouncement(announcementId);

    if (!announcement) {
        redirect("/announcements?error=not-found");
    }

    const shouldPublish =
        announcement.status === "published" || intent === "publish";

    const { error } = await supabase
        .from("announcements")
        .update({
            title,
            body,
            status: shouldPublish ? "published" : "draft",
            published_at: shouldPublish
                ? announcement.published_at ?? new Date().toISOString()
                : null,
        })
        .eq("id", announcement.id);

    if (error) {
        console.error("Announcement update failed:", error);
        redirect(
            `/announcements/${announcementId}/edit?error=update-failed`,
        );
    }

    revalidatePath("/announcements");
    revalidatePath("/teacher/announcements");
    redirect("/announcements?updated=true");
}

export async function deleteAnnouncement(announcementId: string) {
    const { supabase, announcement } =
        await getManageableAnnouncement(announcementId);

    if (!announcement) {
        redirect("/announcements?error=not-found");
    }

    const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcement.id);

    if (error) {
        console.error("Announcement deletion failed:", error);
        redirect("/announcements?error=delete-failed");
    }

    revalidatePath("/announcements");
    revalidatePath("/teacher/announcements");
    redirect("/announcements?deleted=true");
}

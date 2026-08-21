"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/utils/role-guards";

export async function createAnnouncement(formData: FormData) {
    const { supabase, profile } = await requireStaff();

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const intent = String(formData.get("intent") ?? "").trim();
    const mediaBucket = String(formData.get("media_bucket") ?? "").trim();
    const mediaPath = String(formData.get("media_path") ?? "").trim();
    const mediaKind = String(formData.get("media_kind") ?? "").trim();
    const mediaMimeType = String(formData.get("media_mime_type") ?? "").trim();
    const mediaFileName = String(formData.get("media_file_name") ?? "").trim();
    const mediaFileSizeValue = String(formData.get("media_file_size") ?? "").trim();

    if (!title || !body) {
        redirect("/announcements/new?error=missing-fields");
    }

    if (title.length > 160 || body.length > 10000) {
        redirect("/announcements/new?error=content-too-long");
    }

    const hasMedia = Boolean(mediaPath);
    const mediaFileSize = hasMedia ? Number(mediaFileSizeValue) : null;
    const allowedTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
    ]);

    if (
        hasMedia &&
        (mediaBucket !== "announcement-media" ||
            !mediaPath.startsWith(`${profile.id}/`) ||
            !["image", "video"].includes(mediaKind) ||
            !allowedTypes.has(mediaMimeType) ||
            !mediaFileName ||
            !Number.isFinite(mediaFileSize) ||
            Number(mediaFileSize) <= 0 ||
            Number(mediaFileSize) > 250 * 1024 * 1024)
    ) {
        redirect("/announcements/new?error=invalid-media");
    }

    const isAdmin = profile.role === "admin";
    const isPublished = intent === "publish";

    const { error } = await supabase.from("announcements").insert({
        author_profile_id: profile.id,
        audience: isAdmin ? "all_teachers" : "rpm_teachers",
        target_rpm_id: isAdmin ? null : profile.id,
        title,
        body,
        media_bucket: hasMedia ? mediaBucket : null,
        media_path: hasMedia ? mediaPath : null,
        media_kind: hasMedia ? mediaKind : null,
        media_mime_type: hasMedia ? mediaMimeType : null,
        media_file_name: hasMedia ? mediaFileName : null,
        media_file_size: hasMedia ? mediaFileSize : null,
        status: isPublished ? "published" : 'draft',
        published_at: isPublished ? new Date().toISOString() : null,
    });

    if (error) {
        console.error("Announcement creation failed:", error),
        redirect("/announcements/new?error=create-failed");
    }

    redirect("/announcements?created=true");
}

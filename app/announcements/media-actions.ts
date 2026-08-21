"use server";

import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

const MEDIA_BUCKET = "announcement-media";
const MAX_MEDIA_SIZE = 250 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
]);

function safeFileName(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "announcement-media";
}

export async function createAnnouncementMediaUpload(input: {
    fileName: string;
    fileType: string;
    fileSize: number;
}) {
    const { profile } = await requireStaff();

    if (!ALLOWED_MEDIA_TYPES.has(input.fileType)) {
        return {
            ok: false as const,
            error: "Choose an MP4, WebM, MOV, JPG, PNG, or WebP file.",
        };
    }

    if (!input.fileSize || input.fileSize > MAX_MEDIA_SIZE) {
        return {
            ok: false as const,
            error: "The media file must be smaller than 250 MB.",
        };
    }

    const path = [
        profile.id,
        `${crypto.randomUUID()}-${safeFileName(input.fileName)}`,
    ].join("/");

    const admin = createAdminClient();
    const { data, error } = await admin.storage
        .from(MEDIA_BUCKET)
        .createSignedUploadUrl(path);

    if (error || !data?.token) {
        console.error("Announcement signed upload creation failed", {
            profileId: profile.id,
            message: error?.message,
        });

        return {
            ok: false as const,
            error: "The upload could not be started. Please try again.",
        };
    }

    return {
        ok: true as const,
        bucket: MEDIA_BUCKET,
        path,
        token: data.token,
    };
}

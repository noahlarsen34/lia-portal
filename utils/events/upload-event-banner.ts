import "server-only";

import { createAdminClient } from "../supabase/admin";

const EVENT_BANNER_BUCKET = "event-banners";
const MAX_BANNER_SIZE = 5 * 1024 * 1024;

const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

type BannerUploadResult =
    | {
        url: string;
        error: null;
     }
    | {
        url : null;
        error:
            | "invalid-banner-type"
            | "banner-too-large"
            | "banner-upload-failed";
    };

export async function uploadEventBanner(
    eventId: string,
    file: File,
) : Promise<BannerUploadResult> {
    if (!allowedTypes.has(file.type)) {
        return {
            url: null,
            error: "invalid-banner-type",
        };
    }

    if (file.size > MAX_BANNER_SIZE) {
        return {
            url: null,
            error: "banner-too-large",
        };
    }

    const extension = file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
            ? "webp"
            : "jpg";
    
    const filePath = `${eventId}/banner-${crypto.randomUUID()}.${extension}`;

    const admin = createAdminClient();

    const { error } = await admin.storage
        .from(EVENT_BANNER_BUCKET)
        .upload(filePath, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
        });
    
    if (error) {
        console.error("Event banner upload failed", {
            eventId,
            filePath,
            message: error.message,
        });

        return {
            url: null,
            error: "banner-upload-failed",
        };
    }

    const { data } = admin.storage
        .from(EVENT_BANNER_BUCKET)
        .getPublicUrl(filePath);
    
    return {
        url: data.publicUrl,
        error: null,
    };
}

export async function deleteEventBanner(
    publicUrl: string | null,
) {
    if (!publicUrl) {
        return;
    }

    const marker = `/storage/v1/object/public/${EVENT_BANNER_BUCKET}/`;

    let filePath: string | null = null;

    try {
        const pathname = new URL(publicUrl).pathname;
        const markerIndex = pathname.indexOf(marker);

        if (markerIndex >= 0) {
            filePath = decodeURIComponent(
                pathname.slice(markerIndex + marker.length),
            );
        }
    } catch {
        console.error("Invalid event banner URL", {
            publicUrl,
        });
    }

    if (!filePath) {
        return;
    }

    const admin = createAdminClient();

    const { error } = await admin.storage
        .from(EVENT_BANNER_BUCKET)
        .remove([filePath]);

    if (error) {
        console.error("Event banner cleanup failed", {
            publicUrl,
            filePath,
            message: error.message,
        });
    }
}

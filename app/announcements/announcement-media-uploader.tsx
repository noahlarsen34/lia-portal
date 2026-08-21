"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Film, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createAnnouncementMediaUpload } from "./media-actions";

type UploadedMedia = {
    bucket: string;
    path: string;
    kind: "image" | "video";
    mimeType: string;
    fileName: string;
    fileSize: number;
};

type AnnouncementMediaUploaderProps = {
    initialMedia?: UploadedMedia | null;
};

export function AnnouncementMediaUploader({
    initialMedia = null,
}: AnnouncementMediaUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [media, setMedia] = useState<UploadedMedia | null>(initialMedia);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    async function uploadFile(file: File) {
        setError("");
        setUploading(true);

        try {
            const signedUpload = await createAnnouncementMediaUpload({
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
            });

            if (!signedUpload.ok) {
                setError(signedUpload.error);
                return;
            }

            const supabase = createClient();
            const { error: uploadError } = await supabase.storage
                .from(signedUpload.bucket)
                .uploadToSignedUrl(
                    signedUpload.path,
                    signedUpload.token,
                    file,
                    { contentType: file.type },
                );

            if (uploadError) {
                setError(`The media could not be uploaded: ${uploadError.message}`);
                return;
            }

            setMedia({
                bucket: signedUpload.bucket,
                path: signedUpload.path,
                kind: file.type.startsWith("video/") ? "video" : "image",
                mimeType: file.type,
                fileName: file.name,
                fileSize: file.size,
            });
        } finally {
            setUploading(false);
        }
    }

    function clearMedia() {
        setMedia(null);
        setError("");
        if (inputRef.current) inputRef.current.value = "";
    }

    return (
        <div>
            <p className="mb-2 block font-semibold text-zinc-800">
                Media <span className="font-normal text-zinc-500">(optional)</span>
            </p>

            <input type="hidden" name="media_bucket" value={media?.bucket ?? ""} />
            <input type="hidden" name="media_path" value={media?.path ?? ""} />
            <input type="hidden" name="media_kind" value={media?.kind ?? ""} />
            <input type="hidden" name="media_mime_type" value={media?.mimeType ?? ""} />
            <input type="hidden" name="media_file_name" value={media?.fileName ?? ""} />
            <input type="hidden" name="media_file_size" value={media?.fileSize ?? ""} />

            {!media ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center transition hover:border-red-300 hover:bg-red-50/40">
                    {uploading ? (
                        <Loader2 className="h-9 w-9 animate-spin text-[#c8102e]" />
                    ) : (
                        <div className="flex gap-2 text-[#c8102e]">
                            <Film className="h-8 w-8" />
                            <ImageIcon className="h-8 w-8" />
                        </div>
                    )}

                    <span className="mt-4 font-semibold text-zinc-900">
                        {uploading ? "Uploading media…" : "Choose a video or image"}
                    </span>
                    <span className="mt-1 text-sm text-zinc-500">
                        MP4, WebM, MOV, JPG, PNG, or WebP · Maximum 250 MB
                    </span>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
                        disabled={uploading}
                        className="sr-only"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadFile(file);
                        }}
                    />
                </label>
            ) : (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-green-700" />
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-green-950">
                                {media.fileName}
                            </p>
                            <p className="text-sm text-green-700">
                                Upload complete · {(media.fileSize / 1024 / 1024).toFixed(1)} MB
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={clearMedia}
                        className="rounded-lg p-2 text-red-700 hover:bg-red-100"
                        aria-label="Remove uploaded media"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            )}

            {error ? (
                <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
            ) : null}
        </div>
    );
}

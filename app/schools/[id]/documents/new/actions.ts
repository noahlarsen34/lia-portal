"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

const DOCUMENT_BUCKET = 'school-documents';

function cleanFileName(fileName: string) {
    return fileName
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
}

export async function uploadDocument(schoolId: string, formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const documentName = String(formData.get("name") ?? "").trim();
    const documentType = String(formData.get("document_type") ?? "").trim();
    const file = formData.get('file');

    if (!documentName) {
        throw new Error("Document name is required.");
    }

    if (!documentType) {
        throw new Error("Document type is required.");
    }

    if (!(file instanceof File) || file.size === 0) {
        throw new Error("A document file is required.");
    }

    const safeFileName = cleanFileName(file.name);
    const filePath = `${schoolId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
        });

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    const { error: insertError } = await supabase.from("documents").insert({
        school_id: schoolId,
        name: documentName,
        document_type: documentType,
        file_url: filePath,
        uploaded_by: user.id,
    });

    if (insertError) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath]);
        throw new Error(insertError.message);
    }

    redirect(`/schools/${schoolId}`)
}
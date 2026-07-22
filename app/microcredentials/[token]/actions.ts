"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    ALLOWED_MICROCREDENTIAL_FILE_TYPES,
    MAX_MICROCREDENTIAL_FILE_SIZE,
} from "@/utils/microcredentials";

const BUCKET = "microcredential-submissions";

function getString(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function cleanFileName(fileName: string) {
    return fileName
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
}

export async function submitMicrocredential(
    token: string,
    formData: FormData,
) {
    const supabase = createAdminClient();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id")
        .eq("application_token", token)
        .maybeSingle();
    
    if (!liaClass) {
        redirect(`/microcredentials/${token}?error=class-not-found`);
    }

    const enrollmentId = getString(formData, "studentEnrollmentId");
    const credentialType = getString(formData, "credentialType");
    const studentNote = getString(formData, "studentNote");
    const file = formData.get("file");

    if (!enrollmentId) {
        redirect(`/microcredentials/${token}?error=missing-student`);
    }

    if (!credentialType || credentialType.length > 150) {
        redirect(`/microcredentials/${token}?error=invalid-credential`);
    }

    if (!(file instanceof File) || file.size === 0) {
        redirect(`/microcredentials/${token}?error=missing-file`);
    }

    if (
        file.size > MAX_MICROCREDENTIAL_FILE_SIZE ||
        !ALLOWED_MICROCREDENTIAL_FILE_TYPES.includes(file.type)
    ) {
        redirect(`/microcredentials/${token}?error=invalid-file`);
    }

    const { data: enrollment } = await supabase
        .from("lia_class_students")
        .select("id, lia_class_id, students(first_name, last_name)")
        .eq("id", enrollmentId)
        .eq("lia_class_id", liaClass.id)
        .or("status.is.null,status.neq.removed")
        .maybeSingle();
    
    if (!enrollment) {
        redirect(`/microcredentials/${token}?error=missing-student`);
    }

    const student = Array.isArray(enrollment.students)
        ? enrollment.students[0]
        : enrollment.students;
    
    const studentName = 
        `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim();
    
    const safeName = cleanFileName(file.name)
    const filePath =
        `${liaClass.id}/${enrollment.id}/${crypto.randomUUID()}-${safeName}`;
    
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
        });
    
    if (uploadError) {
        redirect(`/microcredentials/${token}?error=upload-failed`);
    }

    const { error: insertError } = await supabase
        .from("microcredential_submissions")
        .insert({
            lia_class_id: liaClass.id,
            student_enrollment_id: enrollment.id,
            student_name_snapshot: studentName,
            credential_type: credentialType,
            file_path: filePath,
            original_file_name: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
            student_note: studentNote || null,
            status: "pending",
        });
    
    if (insertError) {
        await supabase.storage.from(BUCKET).remove([filePath]);
        redirect(`/microcredentials/${token}?error=submission-failed`);
    }

    redirect(`/microcredentials/${token}?submitted=true`);
}

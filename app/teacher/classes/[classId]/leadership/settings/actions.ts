"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";

async function teacherOwnsClass(
    classId: string,
    supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"],
    teacherProfileId: string,
) {
    const { data } = await supabase
        .from("lia_classes")
        .select("id")
        .eq("id", classId)
        .eq("teacher_profile_id", teacherProfileId)
        .maybeSingle();

    return Boolean(data);
}

function settingsPath(classId: string, query?: string) {
    const path = `/teacher/classes/${classId}/leadership/settings`;
    return query ? `${path}?${query}` : path;
}

function revalidateLeadershipPages(classId: string) {
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/teacher/classes/${classId}/students`);
    revalidatePath(`/teacher/classes/${classId}/leadership`);
    revalidatePath(settingsPath(classId));
}

export async function createCommittee(
    classId: string,
    formData: FormData,
) {
    const { supabase, profile } = await requireTeacher();

    if (!(await teacherOwnsClass(classId, supabase, profile.id))) {
        redirect("/teacher/classes");
    }

    const name = String(formData.get("name") ?? "").trim();

    if (!name || name.length > 60) {
        redirect(settingsPath(classId, "error=invalid-committee"));
    }

    const { data: lastCommittee } = await supabase
        .from("lia_class_committees")
        .select("sort_order")
        .eq("lia_class_id", classId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

    const { error } = await supabase
        .from("lia_class_committees")
        .insert({
            lia_class_id: classId,
            name,
            is_default: false,
            sort_order: (lastCommittee?.sort_order ?? 0) + 10,
        });

    if (error) {
        redirect(
            settingsPath(
                classId,
                error.code === "23505"
                    ? "error=duplicate-committee"
                    : "error=create-failed",
            ),
        );
    }

    revalidateLeadershipPages(classId);
    redirect(settingsPath(classId, "success=committee-created"));
}

export async function createRole(classId: string, formData: FormData) {
    const { supabase, profile } = await requireTeacher();

    if (!(await teacherOwnsClass(classId, supabase, profile.id))) {
        redirect("/teacher/classes");
    }

    const name = String(formData.get("name") ?? "").trim();
    const requestedScope = String(
        formData.get("role_scope") ?? "class",
    );
    const roleScope =
        requestedScope === "committee" ? "committee" : "class";
    const allowMultiple = formData.get("allow_multiple") === "on";

    if (!name || name.length > 60) {
        redirect(settingsPath(classId, "error=invalid-role"));
    }

    const { data: lastRole } = await supabase
        .from("lia_class_roles")
        .select("sort_order")
        .eq("lia_class_id", classId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

    const { error } = await supabase
        .from("lia_class_roles")
        .insert({
            lia_class_id: classId,
            name,
            role_scope: roleScope,
            max_assignees: allowMultiple ? null : 1,
            is_default: false,
            sort_order: (lastRole?.sort_order ?? 0) + 10,
        });

    if (error) {
        redirect(
            settingsPath(
                classId,
                error.code === "23505"
                    ? "error=duplicate-role"
                    : "error=create-failed",
            ),
        );
    }

    revalidateLeadershipPages(classId);
    redirect(settingsPath(classId, "success=role-created"));
}

export async function archiveCommittee(
    classId: string,
    committeeId: string,
) {
    const { supabase, profile } = await requireTeacher();

    if (!(await teacherOwnsClass(classId, supabase, profile.id))) {
        redirect("/teacher/classes");
    }

    const { error } = await supabase
        .from("lia_class_committees")
        .update({
            archived_at: new Date().toISOString(),
        })
        .eq("id", committeeId)
        .eq("lia_class_id", classId)
        .eq("is_default", false);

    if (error) {
        redirect(settingsPath(classId, "error=archive-failed"));
    }

    revalidateLeadershipPages(classId);
    redirect(settingsPath(classId, "success=committee-archived"));
}

export async function archiveRole(classId: string, roleId: string) {
    const { supabase, profile } = await requireTeacher();

    if (!(await teacherOwnsClass(classId, supabase, profile.id))) {
        redirect("/teacher/classes");
    }

    const { error } = await supabase
        .from("lia_class_roles")
        .update({
            archived_at: new Date().toISOString(),
        })
        .eq("id", roleId)
        .eq("lia_class_id", classId)
        .eq("is_default", false);

    if (error) {
        redirect(settingsPath(classId, "error=archive-failed"));
    }

    revalidateLeadershipPages(classId);
    redirect(settingsPath(classId, "success=role-archived"));
}

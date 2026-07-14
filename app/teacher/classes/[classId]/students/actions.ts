"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { getValidStudentTier } from "@/utils/student-tier";

function getValidCommittee(committee: string) {
    return committee === "professional" || committee === "service" || committee === "social"
        ? committee
        : null;
}

function getValidOfficerRole(officerRole: string) {
    return officerRole === "president" ||
        officerRole === "vice_president" ||
        officerRole === "secretary" ||
        officerRole === "historian"
        ? officerRole
        : "member";
}

function getEnrollmentCommittee(officerRole: string, committee: string | null) {
    return officerRole === "member" || officerRole === "vice_president"
        ? committee
        : null;
}

async function findOfficerRoleConflict(
    supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"],
    classId: string,
    officerRole: string,
    committee: string | null,
    currentEnrollmentId?: string,
) {
    if (officerRole === "member") {
        return false;
    }

    let query = supabase
        .from("lia_class_students")
        .select("id")
        .eq("lia_class_id", classId)
        .eq("officer_role", officerRole)
        .neq("status", "removed");

    if (officerRole === "vice_president") {
        query = query.eq("committee", committee);
    }

    if (currentEnrollmentId) {
        query = query.neq("id", currentEnrollmentId);
    }

    const { data } = await query.limit(1);

    return Boolean(data && data.length > 0);
}

export async function addStudentToClass(classId: string, formData: FormData) {
    const { supabase, profile } = await requireTeacher();

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const gradeLevel = String(formData.get("grade_level") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const committee = String(formData.get("committee") ?? "").trim();
    const officerRole = String(formData.get("officer_role") ?? "member").trim();
    const validCommittee = getValidCommittee(committee);
    const validOfficerRole = getValidOfficerRole(officerRole);
    const enrollmentCommittee = getEnrollmentCommittee(validOfficerRole, validCommittee);
    const tier = getValidStudentTier(formData.get("tier"));

    if (!firstName || !lastName) {
        redirect(`/teacher/classes/${classId}/students?error=missing-fields`);
    }

    if (validOfficerRole === "vice_president" && !validCommittee) {
        redirect(`/teacher/classes/${classId}/students?error=vp-needs-committee`);
    }

    if (
        await findOfficerRoleConflict(
            supabase,
            classId,
            validOfficerRole,
            enrollmentCommittee,
        )
    ) {
        redirect(`/teacher/classes/${classId}/students?error=role-conflict`);
    }

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, school_id")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();

    if (!liaClass) {
        redirect("/teacher/classes");
    }

    let studentId: string | null = null;

    if (email) {
        const { data: existingStudent } = await supabase
            .from("students")
            .select("id")
            .eq("school_id", liaClass.school_id)
            .eq("email", email)
            .limit(1)
            .maybeSingle();

        studentId = existingStudent?.id ?? null;
    }

    if (!studentId) {
        const { data: student, error: studentError } = await supabase
            .from("students")
            .insert({
                school_id: liaClass.school_id,
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                grade_level: gradeLevel || null,
                notes: notes || null,
            })
            .select("id")
            .single();

        if (studentError || !student) {
            redirect(`/teacher/classes/${classId}/students?error=create-failed`);
        }

        studentId = student.id;
    }

    const { data: existingEnrollment } = await supabase
        .from("lia_class_students")
        .select("id, status")
        .eq("lia_class_id", classId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (existingEnrollment) {
        if (existingEnrollment.status !== "removed") {
            redirect(`/teacher/classes/${classId}/students?error=already-enrolled`);
        }

        const { error: reactivateError } = await supabase
            .from("lia_class_students")
            .update({
                status: "active",
                committee: enrollmentCommittee,
                officer_role: validOfficerRole,
                tier,
                removed_at: null,
            })
            .eq("id", existingEnrollment.id)
            .eq("lia_class_id", classId);

        if (reactivateError) {
            if (reactivateError.code === "23505") {
                redirect(`/teacher/classes/${classId}/students?error=role-conflict`);
            }

            redirect(`/teacher/classes/${classId}/students?error=enroll-failed`);
        }

        revalidatePath(`/teacher/classes/${classId}`);
        revalidatePath(`/teacher/classes/${classId}/students`);
        revalidatePath(`/schools/${liaClass.school_id}`);
        redirect(`/teacher/classes/${classId}/students`);
    }

    const { error: enrollmentError } = await supabase
        .from("lia_class_students")
        .insert({
            lia_class_id: classId,
            student_id: studentId,
            status: "active",
            committee: enrollmentCommittee,
            officer_role: validOfficerRole,
            tier,
        });

    if (enrollmentError) {
        if (enrollmentError.code === "23505") {
            redirect(`/teacher/classes/${classId}/students?error=already-enrolled`);
        }

        redirect(`/teacher/classes/${classId}/students?error=enroll-failed`);
    }

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/teacher/classes/${classId}/students`);
    revalidatePath(`/schools/${liaClass.school_id}`);
    redirect(`/teacher/classes/${classId}/students`);
}

export async function updateClassStudent(
    classId: string,
    enrollmentId: string,
    formData: FormData,
) {
    const { supabase, profile } = await requireTeacher();

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const gradeLevel = String(formData.get("grade_level") ?? "").trim();
    const studentStatus = String(formData.get("student_status") ?? "active").trim();
    const enrollmentStatus = String(formData.get("enrollment_status") ?? "active").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const committee = String(formData.get("committee") ?? "").trim();
    const officerRole = String(formData.get("officer_role") ?? "member").trim();
    const validCommittee = getValidCommittee(committee);
    const validOfficerRole = getValidOfficerRole(officerRole);
    const enrollmentCommittee = getEnrollmentCommittee(validOfficerRole, validCommittee);
    const tier = getValidStudentTier(formData.get("tier"));

    if (!firstName || !lastName) {
        redirect (
            `/teacher/classes/${classId}/students/${enrollmentId}/edit?error=missing-fields`
        );
    }

    if (validOfficerRole === "vice_president" && !validCommittee) {
        redirect(
            `/teacher/classes/${classId}/students/${enrollmentId}/edit?error=vp-needs-committee`
        );
    }

    if (
        await findOfficerRoleConflict(
            supabase,
            classId,
            validOfficerRole,
            enrollmentCommittee,
            enrollmentId,
        )
    ) {
        redirect(
            `/teacher/classes/${classId}/students/${enrollmentId}/edit?error=role-conflict`
        );
    }

    const { data: enrollment } = await supabase
        .from("lia_class_students")
        .select(`
                id,
                student_id,
                lia_classes (
                    id,
                    school_id,
                    teacher_profile_id
                )  
            `)
        .eq("id", enrollmentId)
        .eq("lia_class_id", classId)
        .maybeSingle();
    
    const liaClass = Array.isArray(enrollment?.lia_classes)
            ? enrollment?.lia_classes[0]
            : enrollment?.lia_classes;
        
    if (!enrollment || liaClass?.teacher_profile_id !== profile.id) {
        redirect(`/teacher/classes/${classId}/students?error=not-found`);
    }

    const validStudentStatus = studentStatus === "inactive" ? "inactive" : "active";
    const validEnrollmentStatus =
        enrollmentStatus === "completed"
            ? "completed"
            : enrollmentStatus === "removed"
                ? "removed"
                : "active";
    
    const { error: studentError } = await supabase
        .from("students")
        .update({
            first_name: firstName,
            last_name: lastName,
            email: email || null,
            grade_level: gradeLevel || null,
            status: validStudentStatus,
            notes: notes || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", enrollment.student_id);
    
    if (studentError) {
        redirect(
            `/teacher/classes/${classId}/students/${enrollmentId}/edit?error=update-failed`
        );
    }

    const { error: enrollmentError } = await supabase
        .from("lia_class_students")
        .update({
            status: validEnrollmentStatus,
            committee: enrollmentCommittee,
            officer_role: validOfficerRole,
            tier,
            removed_at:
                validEnrollmentStatus === "removed"
                    ? new Date().toISOString()
                    : null,
        })
        .eq("id", enrollmentId)
        .eq("lia_class_id", classId);
    
    if (enrollmentError) {
        if (enrollmentError.code === "23505") {
            redirect(
                `/teacher/classes/${classId}/students/${enrollmentId}/edit?error=already-enrolled`
            );
        }

        redirect(
            `/teacher/classes/${classId}/students/${enrollmentId}/edit?error=update-failed`
        );
    }

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/teacher/classes/${classId}/students`);

    if (liaClass?.school_id) {
        revalidatePath(`/schools/${liaClass.school_id}`);
    }

    redirect(`/teacher/classes/${classId}/students`);
}

export async function removeStudentFromClass(
    classId: string,
    enrollmentId: string,
) {
    const { supabase, profile } = await requireTeacher();

    const { data: enrollment } = await supabase
        .from("lia_class_students")
        .select(`
                id,
                lia_classes (
                    id,
                    school_id,
                    teacher_profile_id 
                ) 
            `)
        .eq("id", enrollmentId)
        .eq("lia_class_id", classId)
        .maybeSingle();
    
    const liaClass = Array.isArray(enrollment?.lia_classes)
            ? enrollment?.lia_classes[0]
            : enrollment?.lia_classes;
        
    if (!enrollment || liaClass?.teacher_profile_id !== profile.id) {
        redirect(`/teacher/classes/${classId}/students?error=not-found`);
    }

    const { error } = await supabase
        .from("lia_class_students")
        .update({
            status: "removed",
            removed_at: new Date().toISOString(),
        })
        .eq("id", enrollmentId)
        .eq("lia_class_id", classId);
    
    if (error) {
        redirect(`/teacher/classes/${classId}/students?error=remove-failed`);
    }

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/teacher/classes/${classId}/students`);

    if (liaClass?.school_id) {
        revalidatePath(`/schools/${liaClass.school_id}`);
    }

    redirect(`/teacher/classes/${classId}/students`);
}

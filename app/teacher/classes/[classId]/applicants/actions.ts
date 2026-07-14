"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { sendEmail, escapeHtml } from '@/utils/email';

type ApplicationStatus = "submitted" | "maybe" | "accepted" | "declined";

async function getTeacherApplication(
    classId: string,
    applicationId: string,
) {
    const { supabase, profile } = await requireTeacher();

    const { data: application } = await supabase
        .from("lia_class_applications")
        .select(`
                id,
                lia_class_id,
                school_id,
                teacher_profile_id,
                first_name,
                last_name,
                email,
                grade_level,
                status,
                lia_classes (
                    id,
                    name,
                    school_id,
                    teacher_profile_id,
                    schools (
                        name
                    )
                )
            `,
        )
        .eq("id", applicationId)
        .eq("lia_class_id", classId)
        .maybeSingle();

    const liaClass = Array.isArray(application?.lia_classes)
        ? application?.lia_classes[0]
        : application?.lia_classes;
    
    if (!application || !liaClass || liaClass.teacher_profile_id !== profile.id) {
        redirect(`/teacher/classes/${classId}/applicants?error=not-found`);
    }

    return { supabase, profile, application, liaClass };
}

export async function updateApplicationStatus (
    classId: string,
    applicationId: string,
    status: ApplicationStatus,
) {
    if (!["submitted", "maybe", "accepted", "declined"].includes(status)) {
        redirect(`/teacher/classes/${classId}/applicants?error=invalid-status`);
    }

    const { supabase, application, liaClass } = await getTeacherApplication(classId, applicationId);

    const { error } = await supabase
        .from("lia_class_applications")
        .update({
            status,
            reviewed_at: status === "submitted" ? null : new Date().toISOString(),
        })
        .eq("id", applicationId)
        .eq("lia_class_id", classId);
    
    if (error) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=update-failed`,
        );
    }

    if (status === "declined") {
        await sendApplicationDecisionEmail({
            application,
            liaClass,
            decision: "declined",
        });
    }

    revalidatePath(`/teacher/classes/${classId}/applicants`);
    revalidatePath(`/teacher/classes/${classId}/applicants/${applicationId}`);
    redirect(
        `/teacher/classes/${classId}/applicants/${applicationId}?success=status-updated`,
    );
}

export async function updateApplicationReview(
    classId: string,
    applicationId: string,
    formData: FormData,
) {
    const { supabase } = await getTeacherApplication(classId, applicationId);

    const recommendationComplete =
        formData.get("recommendation_complete") === "on";
    const completedInterview = formData.get("completed_interview") === "on";
    const interviewAgain = formData.get("interview_again") === "on";
    const teacherComments = String(formData.get("teacher_comments") ?? "").trim();

    const { error } = await supabase
        .from("lia_class_applications")
        .update({
            recommendation_complete: recommendationComplete,
            completed_interview: completedInterview,
            interview_again: interviewAgain,
            teacher_comments: teacherComments || null,
        })
        .eq("id", applicationId)
        .eq("lia_class_id", classId);
    
    if (error) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=update-failed`,
        );
    }

    revalidatePath(`/teacher/classes/${classId}/applicants`);
    revalidatePath(`/teacher/classes/${classId}/applicants/${applicationId}`);
    redirect(`/teacher/classes/${classId}/applicants/${applicationId}?success=review-saved`);
}

export async function acceptApplication(
    classId: string,
    applicationId: string,
) {
    const { supabase, application, liaClass } = await getTeacherApplication(
        classId,
        applicationId,
    )

    let studentId: string | null = null;
    const normalizedEmail = application.email?.trim().toLowerCase() || null;
    
    if (normalizedEmail) {
        const { data: existingStudent } = await supabase
            .from("students")
            .select("id")
            .eq("school_id", liaClass.school_id)
            .eq("email", normalizedEmail)
            .maybeSingle();
        
        studentId = existingStudent?.id ?? null;
    }

    if (!studentId) {
        const { data: student, error: studentError } = await supabase
            .from("students")
            .insert({
                school_id: liaClass.school_id,
                first_name: application.first_name,
                last_name: application.last_name,
                email: normalizedEmail,
                grade_level: application.grade_level || null,
            })
            .select("id")
            .single();
        
        if (studentError || !student) {
            redirect(`/teacher/classes/${classId}/applicants?error=create-student-failed`);
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
            redirect(
                `/teacher/classes/${classId}/applicants/${applicationId}?error=already-enrolled`,
            );
        }

        if (existingEnrollment.status === "removed") {
            const { error: reactivateError } = await supabase
                .from("lia_class_students")
                .update({
                    status: "active",
                    removed_at: null,
                })
                .eq("id", existingEnrollment.id)
                .eq("lia_class_id", classId);
            
            if (reactivateError) {
                redirect(`/teacher/classes/${classId}/applicants?error=enroll-failed`);
            }
        }
    } else {
        const { error: enrollmentError } = await supabase
            .from("lia_class_students")
            .insert({
                lia_class_id: classId,
                student_id: studentId,
                status: "active",
                officer_role: "member",
            });
        if (enrollmentError) {
            redirect(
                `/teacher/classes/${classId}/applicants/${applicationId}?error=enroll-failed`,
            );
        }
    }

    const { error: applicationError} = await supabase
        .from("lia_class_applications")
        .update({
            status: "accepted",
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId)
        .eq("lia_class_id", classId);
    
    if (applicationError) {
        redirect(
            `/teacher/classes/${classId}/applicants/${applicationId}?error=update-failed`,
        );
    }

    await sendApplicationDecisionEmail({
        application,
        liaClass,
        decision: "accepted"
    });

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/teacher/classes/${classId}/students`);
    revalidatePath(`/teacher/classes/${classId}/applicants`);
    revalidatePath(`/teacher/classes/${classId}/applicants/${applicationId}`);
    revalidatePath(`/schools/${liaClass.school_id}`);

    redirect(
        `/teacher/classes/${classId}/applicants/${applicationId}?success=status-updated`,
    );
}

async function sendApplicationDecisionEmail({
    application,
    liaClass,
    decision,
} : {
    application: {
        first_name: string;
        email: string | null;
    };
    liaClass : {
        name: string
        schools?: {name: string | null } | {name: string | null }[] | null;
    };
    decision: "accepted" | "declined";
}) {
    if (!application.email) {
        return;
    }

    const school = Array.isArray(liaClass.schools)
        ? liaClass.schools[0]
        : liaClass.schools;
    
    const accepted = decision === "accepted";

    await sendEmail({
        to: application.email,
        subject: "Your LIA application decision",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h1>Your LIA application decision</h1>
                <p>Hi ${escapeHtml(application.first_name)},</p>
                <p>
                    Thank you for applying to Latinos In Action
                    ${school?.name ? `at <strong>${escapeHtml(school.name)}</strong>` : ""}
                </p>
                ${
                    accepted
                        ? `<p><strong>Congratulations!</strong> Your application for <strong>${escapeHtml(liaClass.name)}</strong> has been accepted.</p>`
            : `<p>After reviewing your application, you were not selected for <strong>${escapeHtml(liaClass.name)}</strong> at this time.</p>`
        }
        <p>Thank you,<br/>Latinos In Action</p>
      </div>
    `,
  });
}

export async function archiveApplication(
    classId: string,
    applicationId: string,
) {
    const { supabase } = await getTeacherApplication(classId, applicationId);

    const { error } = await supabase
        .from("lia_class_applications")
        .update({
            archived_at: new Date().toISOString(),
        })
        .eq("id", applicationId)
        .eq("lia_class_id", classId);
    
    if (error) {
        redirect(`/teacher/classes/${classId}/applicants?error=archive-failed`);
    }

    revalidatePath(`/teacher/classes/${classId}/applicants`);
    redirect(`/teacher/classes/${classId}/applicants?success=archived`);
}
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";

function getString(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function getDurationMinutes(arrivalTime: string, departureTime: string) {
    const [arrivalHours, arrivalMinutes] = arrivalTime.split(":").map(Number);
    const [departureHours, departureMinutes] = departureTime.split(":").map(Number);

    if (
        Number.isNaN(arrivalHours) ||
        Number.isNaN(arrivalMinutes) ||
        Number.isNaN(departureHours) ||
        Number.isNaN(departureMinutes)
    ) {
        return 0;
    }

    return departureHours * 60 + departureMinutes - (arrivalHours * 60 + arrivalMinutes);
}

async function verifyTeacherOwnsClass(classId: string) {
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass) {
        throw new Error("Class not found");
    }

    return { supabase, profile };
}

export async function approveTutoringLog(classId: string, logId: string) {
    const { supabase, profile } = await verifyTeacherOwnsClass(classId);

    await supabase
        .from("tutoring_logs")
        .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: profile.id,
        })
        .eq("id", logId)
        .eq("lia_class_id", classId);
    
    revalidatePath(`/teacher/classes/${classId}/tutoring`);
}

export async function rejectTutoringLog(classId: string, logId: string) {
    const { supabase } = await verifyTeacherOwnsClass(classId);

    await supabase
        .from("tutoring_logs")
        .update({
            status: "rejected",
            approved_at: null,
            approved_by: null,
        })
        .eq("id", logId)
        .eq("lia_class_id", classId);
    
    revalidatePath(`/teacher/classes/${classId}/tutoring`);
}

export async function updateTutoringLog(
    classId: string,
    logId: string,
    formData: FormData,
) {
    const { supabase, profile } = await verifyTeacherOwnsClass(classId);

    const activityType = getString(formData, "activityType");
    const sessionDate = getString(formData, "sessionDate");
    const arrivalTime = getString(formData, "arrivalTime");
    const departureTime = getString(formData, "departureTime");
    const status = getString(formData, "status");
    const englishLanguageProficiency = getString(
        formData,
        "englishLanguageProficiency",
    );

    if (!sessionDate || !arrivalTime || !departureTime) {
        redirect(
            `/teacher/classes/${classId}/tutoring?editLogId=${logId}&error=missing-fields`,
        );
    }

    const durationMinutes = getDurationMinutes(arrivalTime, departureTime);

    if (durationMinutes <= 0) {
        redirect(
            `/teacher/classes/${classId}/tutoring?editLogId=${logId}&error=invalid-time`,
        );
    }

    const validActivityType = activityType === "service" ? "service" : "tutoring";
    const validStatus =
        status === "approved" || status === "rejected" ? status : "pending";

    const { error } = await supabase
        .from("tutoring_logs")
        .update({
            school_site: getString(formData, "schoolSite") || null,
            class_period: getString(formData, "classPeriod") || null,
            activity_type: validActivityType,
            session_date: sessionDate,
            arrival_time: arrivalTime,
            departure_time: departureTime,
            duration_minutes: durationMinutes,
            mentor_initials: getString(formData, "mentorInitials") || null,
            major_activities: getString(formData, "majorActivities") || null,
            comments: getString(formData, "comments") || null,
            elementary_mentee_name:
                getString(formData, "elementaryMenteeName") || null,
            mentee_grade: getString(formData, "menteeGrade") || null,
            english_language_proficiency: englishLanguageProficiency || null,
            cooperating_elementary_teacher:
                getString(formData, "cooperatingElementaryTeacher") || null,
            status: validStatus,
            approved_at:
                validStatus === "approved" ? new Date().toISOString() : null,
            approved_by: validStatus === "approved" ? profile.id : null,
        })
        .eq("id", logId)
        .eq("lia_class_id", classId);

    if (error) {
        redirect(
            `/teacher/classes/${classId}/tutoring?editLogId=${logId}&error=update-failed`,
        );
    }

    revalidatePath(`/teacher/classes/${classId}/tutoring`);
    redirect(`/teacher/classes/${classId}/tutoring`);
}

export async function deleteTutoringLog(classId: string, logId: string) {
    const { supabase } = await verifyTeacherOwnsClass(classId);

    const { data: deletedLog, error } = await supabase
        .from("tutoring_logs")
        .delete()
        .eq("id", logId)
        .eq("lia_class_id", classId)
        .select("id")
        .maybeSingle();
    
    if (error || !deletedLog) {
        throw new Error("Could not delete this tutoring log.");
    }

    revalidatePath(`/teacher/classes/${classId}/tutoring`);
}
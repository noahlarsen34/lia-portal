"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

function getString(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function getDurationMinutes(arrivalTime: string, departureTime: string) {
    const [arrivalHours, arrivalMinutes] = arrivalTime.split(":").map(Number);
    const [departureHours, departureMinutes] = departureTime.split(":").map(Number);

    const arrivalTotal = arrivalHours * 60 + arrivalMinutes;
    const departureTotal = departureHours * 60 + departureMinutes;

    return departureTotal - arrivalTotal;
}

export async function submitTutoringLog(token: string, formData: FormData){
    const supabase = await createClient();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id")
        .eq("application_token", token)
        .maybeSingle();

    if (!liaClass) {
        redirect(`/tutoring/${token}?error=class-not-found`);
    }

    const studentEnrollmentId = getString(formData, "studentEnrollmentId");
    const activityType = getString(formData, "activityType");
    const sessionDate = getString(formData, "sessionDate");
    const arrivalTime = getString(formData, "arrivalTime");
    const departureTime = getString(formData, "departureTime");

    if (!studentEnrollmentId) {
        redirect(`/tutoring/${token}?error=missing-student`);
    }

    const durationMinutes = getDurationMinutes(arrivalTime, departureTime);

    if (!durationMinutes || durationMinutes <= 0) {
        redirect(`/tutoring/${token}?error=invalid-time`);
    }

    const { data: enrollment } = await supabase
        .from("lia_class_students")
        .select(
            `
                id,
                lia_class_id,
                students (
                    first_name,
                    last_name 
                )
            `,
        )
        .eq("id", studentEnrollmentId)
        .eq("lia_class_id", liaClass.id)
        .maybeSingle();
    
    if (!enrollment) {
        redirect(`/tutoring/${token}?error=missing-student`);
    }

    const student = Array.isArray(enrollment.students)
        ? enrollment.students[0]
        : enrollment.students;
    
    const studentName = `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim();

    const { error } = await supabase.from("tutoring_logs").insert({
        lia_class_id: liaClass.id,
        student_enrollment_id: studentEnrollmentId,

        student_name_snapshot: studentName,
        school_site: getString(formData, "schoolSite") || null,
        class_period: getString(formData, "classPeriod") || null,

        activity_type: activityType,
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
        english_language_proficiency:
            getString(formData, "englishLanguageProficiency") || null,
        cooperating_elementary_teacher:
            getString(formData, "cooperatingElementaryTeacher") || null,
        
        status: "pending",
    });

    if (error) {
        redirect(`/tutoring/${token}?error=submission-failed`);
    }

    redirect(`/tutoring/${token}?submitted=true`);
}

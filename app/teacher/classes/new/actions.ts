"use server";

import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";

export async function createLiaClass(formData: FormData) {
    const { supabase, profile } = await requireTeacher();

    const name = String(formData.get("name") ?? "").trim();
    const schoolYear = String(formData.get("school_year") ?? "").trim();
    const period = String(formData.get("period") ?? "").trim();
    const gradeLevel = String(formData.get("grade_level") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const scheduleType = String(
        formData.get("schedule_type") ?? "traditional",
    ).trim();

    const timezone = String(
        formData.get("timezone") ?? "America/Denver",
    ).trim();

    const meetingDays = formData
        .getAll("meeting_days")
        .map((day) => String(day));
    
    const startTime = String(
        formData.get("start_time") ?? "",
    ).trim();

    const endTime = String(
        formData.get("end_time") ?? "",
    ).trim();

    const startDate = String(
        formData.get("start_date") ?? "",
    ).trim();

    const endDate = String(
        formData.get("end_date") ?? "",
    ).trim();

    const blockDesignation = String(
        formData.get("block_designation") ?? "",
    ).trim();

    if (!name || !schoolYear) {
        redirect("/teacher/classes/new?error=missing-fields");
    }

    const validScheduleTypes = new Set([
        "traditional",
        "block",
        "other",
    ]);

    const validTimezones = new Set([
        "America/Los_Angeles",
        "America/Denver",
        "America/Phoenix",
        "America/Chicago",
        "America/New_York",
        "America/Anchorage",
        "Pacific/Honolulu",
    ]);


    const validDays = new Set([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
    ]);

    const validBlockDesignations = new Set([
        "a_day",
        "b_day",
        "both",
    ]);

    const scheduleIsInvalid =
        !validScheduleTypes.has(scheduleType) ||
        !validTimezones.has(timezone) ||
        meetingDays.some((day) => !validDays.has(day)) ||
        Boolean(startTime) !== Boolean(endTime) ||
        Boolean(startDate) !== Boolean(endDate) ||
        (startTime && endTime && endTime <= startTime) ||
        (startDate && endDate && endDate < startDate) ||
        (
            scheduleType === "block" &&
            blockDesignation !== "" &&
            !validBlockDesignations.has(blockDesignation)
        );
    
    if (scheduleIsInvalid) {
        redirect(
            "/teacher/classes/new?error=invalid-schedule",
        );
    }

    const { data: teacher } = await supabase
        .from("teachers")
        .select("id, school_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

    if (!teacher) {
        redirect("/teacher/classes/new?error=teacher-not-linked");
    }

    const { error } = await supabase.from("lia_classes").insert({
        teacher_profile_id: profile.id,
        school_id: teacher.school_id,
        name,
        school_year: schoolYear,
        period: period || null,
        grade_level: gradeLevel || null,
        status: status === "inactive" ? "inactive" : "active",
        notes: notes || null,
        schedule_type: scheduleType,
        timezone,
        meeting_days: meetingDays,
        start_time: startTime || null,
        end_time: endTime || null,
        start_date: startDate || null,
        end_date: endDate || null,
        block_designation:
            scheduleType === "block" && blockDesignation
                ? blockDesignation
                : null,
    });

    if (error) {
        redirect("/teacher/classes/new?error=create-failed");
    }
    
    redirect("/teacher/classes");
}

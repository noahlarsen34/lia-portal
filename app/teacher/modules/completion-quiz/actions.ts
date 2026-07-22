"use server";

import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import {
    newTeacherQuizQuestions,
    scoreNewTeacherQuiz,
} from "@/utils/new-teacher-quiz";

export async function submitNewTeacherQuiz(formData: FormData) {
    const { supabase, user, profile } = await requireTeacher();

    const answers = Object.fromEntries(
        newTeacherQuizQuestions.map((question) => [
            question.id,
            String(formData.get(question.id) ?? ""),
        ]),
    );

    const result = scoreNewTeacherQuiz(answers);

    const { data: teacher } = await supabase
        .from("teachers")
        .select(
            `
                id,
                school_id,
                first_name,
                last_name,
                email,
                schools (
                    id,
                    name,
                    state,
                    district_id,
                    districts (
                        id,
                        name 
                    )
                )
            `,
        )
        .eq("profile_id", profile.id)
        .maybeSingle();
    
    const school = Array.isArray(teacher?.schools)
        ? teacher.schools[0]
        : teacher?.schools;
    
    const district = Array.isArray(school?.districts)
        ? school.districts[0]
        : school?.districts;
    
    const teacherEmail = teacher?.email ?? profile.email ?? user.email ?? "";
    const firstName = teacher?.first_name ?? profile.full_name?.split(" ")[0] ?? "";
    const lastName = teacher?.last_name ?? "";

    const { error } = await supabase.from("teacher_module_quiz_attempts").insert({
        teacher_profile_id: profile.id,
        teacher_record_id: teacher?.id ?? null,
        school_id: teacher?.school_id ?? null,
        district_id: school?.district_id ?? null,

        teacher_email: teacherEmail,
        teacher_first_name: firstName,
        teacher_last_name: lastName,
        school_name: school?.name ?? null,
        district_name: district?.name ?? null,
        state: school?.state ?? null,

        score: result.score,
        total_questions: result.totalQuestions,
        passed: result.passed,
        answers,
    });

    if (error) {
        redirect("/teacher/modules/completion-quiz?error=submission-failed");
    }

    redirect(
        `/teacher/modules/completion-quiz/complete?score=${result.score}&total=${result.totalQuestions}&passing=${result.passingScore}&passed=${result.passed ? "true" : "false"}`,
    );
}

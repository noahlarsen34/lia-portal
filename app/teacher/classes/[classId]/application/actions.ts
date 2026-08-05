"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import type { ApplicationQuestionType } from "@/utils/application-form";

const validQuestionTypes: ApplicationQuestionType[] = [
    "short_text",
    "long_text",
    "number",
    "multiple_choice",
    "yes_no",
    "file_upload",
];

const lockedQuestionConfiguration = {
    first_name: {
        question_type: "short_text",
        required: true,
    },
    last_name: {
        question_type: "short_text",
        required: true,
    },
    email: {
        question_type: "short_text",
        required: false,
    },
    grade_level: {
        question_type: "short_text",
        required: false,
    },
    gpa: {
        question_type: "number",
        required: true,
    },
} as const;

type SubmittedQuestion ={
    id?: unknown;
    question_key?: unknown;
    label_en?: unknown;
    label_es?: unknown;
    question_type?: unknown;
    required?: unknown;
    options?: unknown;
    position?: unknown;
    is_locked?: unknown;
};

type ValidQuestion = {
    question_key: string;
    label_en: string;
    label_es: string | null;
    question_type: ApplicationQuestionType;
    required: boolean;
    options: string[];
    position: number;
    is_locked: boolean;
};

function errorRedirect(classId: string, error: string): never {
    redirect(
        `/teacher/classes/${classId}/application?error=${encodeURIComponent(error)}`,
    );
}

function normalizeQuestionKey(value: unknown) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
}

function validateQuestions(
    classId: string,
    rawQuestions: unknown,
) : ValidQuestion[] {
    if (!Array.isArray(rawQuestions)) {
        errorRedirect(classId, "invalid-questions");
    }

    if (rawQuestions.length < 5 || rawQuestions.length > 30) {
        errorRedirect(classId, "invalid-question-count");
    }

    const questions = rawQuestions as SubmittedQuestion[];
    const seenKeys = new Set<string>();

    const validated = questions.map((question, index) => {
        const questionKey = normalizeQuestionKey(question.question_key);
        const labelEn = String(question.label_en ?? "").trim().slice(0,300);
        const labelEs = 
            String(question.label_es ?? "").trim().slice(0,300) || null;
        const questionType = String(
            question.question_type ?? "",
        ) as ApplicationQuestionType;

        if (!questionKey || !labelEn) {
            errorRedirect(classId, "missing-question-label");
        }

        if (seenKeys.has(questionKey)) {
            errorRedirect(classId, "duplicate-question-key");
        }

        seenKeys.add(questionKey);

        if (!validQuestionTypes.includes(questionType)) {
            errorRedirect(classId, "invalid-question-type");
        }

        let options: string[] = [];

        if (questionType === "multiple_choice") {
            if (!Array.isArray(question.options)) {
                errorRedirect(classId, "invalid-options");
            }

            options = question.options
                .map((option) => String(option ?? "").trim().slice(0,150))
                .filter(Boolean);
            
            options = Array.from(new Set(options));

            if (options.length < 2 || options.length > 20) {
                errorRedirect(classId, "invalid-options");
            }
        }

        const lockedConfiguration =
            lockedQuestionConfiguration[
                questionKey as keyof typeof lockedQuestionConfiguration
            ];
        
        if (lockedConfiguration) {
            return {
                question_key: questionKey,
                label_en: labelEn,
                label_es: labelEs,
                question_type:
                    lockedConfiguration.question_type as ApplicationQuestionType,
                required: lockedConfiguration.required,
                options: [],
                position: index,
                is_locked: true,
            };
        }

        return {
            question_key: questionKey,
            label_en: labelEn,
            label_es: labelEs,
            question_type: questionType,
            required: Boolean(question.required),
            options,
            position: index,
            is_locked: false,
        };
    });

    for (const requiredKey of Object.keys(lockedQuestionConfiguration)) {
        if (!seenKeys.has(requiredKey)) {
            errorRedirect(classId, "missing-required-question");
        }
    }

    return validated;
}

async function getOwnedClass(classId: string) {
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name, teacher_profile_id")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();

    if (!liaClass) {
        redirect("/teacher/classes");
    }

    return {
        supabase,
        profile,
        liaClass,
    };
}

export async function saveApplicationForm(
    classId: string,
    formData: FormData,
) {
    const { supabase, profile } = await getOwnedClass(classId);

    const intent =
        String(formData.get("intent") ?? "") === "publish"
            ? "publish"
            : "draft";

    const title =
        String(formData.get("title") ?? "").trim().slice(0, 150) ||
        "Student Application";

    const intro =
        String(formData.get("intro") ?? "").trim().slice(0, 1000) || null;

    let parsedQuestions: unknown;

    try {
        parsedQuestions = JSON.parse(
            String(formData.get("questions") ?? "[]"),
        );
    } catch {
        errorRedirect(classId, "invalid-questions");
    }

    const questions = validateQuestions(classId, parsedQuestions);

    const { data: latestForm, error: latestFormError } = await supabase
        .from("application_forms")
        .select("id, version, status")
        .eq("lia_class_id", classId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestFormError) {
        errorRedirect(classId, "load-failed");
    }

    let targetFormId: string;

    if (!latestForm || latestForm.status !== "draft") {
        const nextVersion = (latestForm?.version ?? 0) + 1;

        const { data: newForm, error: createError } = await supabase
            .from("application_forms")
            .insert({
                lia_class_id: classId,
                title,
                intro,
                version: nextVersion,
                status: "draft",
                created_by: profile.id,
            })
            .select("id")
            .single();

        if (createError || !newForm) {
            errorRedirect(classId, "save-failed");
        }

        targetFormId = newForm.id;
    } else {
        targetFormId = latestForm.id;

        const { error: updateError } = await supabase
            .from("application_forms")
            .update({
                title,
                intro,
                updated_at: new Date().toISOString(),
            })
            .eq("id", targetFormId)
            .eq("lia_class_id", classId);

        if (updateError) {
            errorRedirect(classId, "save-failed");
        }

        const { error: deleteError } = await supabase
            .from("application_questions")
            .delete()
            .eq("application_form_id", targetFormId);

        if (deleteError) {
            errorRedirect(classId, "save-failed");
        }
    }

    const { error: questionsError } = await supabase
        .from("application_questions")
        .insert(
            questions.map((question) => ({
                application_form_id: targetFormId,
                ...question,
            })),
        );

    if (questionsError) {
        console.error("Application questions could not be saved", {
            classId,
            formId: targetFormId,
            message: questionsError.message,
            code: questionsError.code,
            details: questionsError.details,
        });

        errorRedirect(classId, "save-failed");
    }

    if (intent === "publish") {
        const { error: archiveError } = await supabase
            .from("application_forms")
            .update({
                status: "archived",
                updated_at: new Date().toISOString(),
            })
            .eq("lia_class_id", classId)
            .eq("status", "published")
            .neq("id", targetFormId);

        if (archiveError) {
            errorRedirect(classId, "publish-failed");
        }

        const { error: publishError } = await supabase
            .from("application_forms")
            .update({
                title,
                intro,
                status: "published",
                updated_at: new Date().toISOString(),
            })
            .eq("id", targetFormId)
            .eq("lia_class_id", classId);

        if (publishError) {
            errorRedirect(classId, "publish-failed");
        }
    }

    revalidatePath(`/teacher/classes/${classId}/application`);
    revalidatePath(`/teacher/classes/${classId}/applicants`);
    revalidatePath(`/apply`);

    redirect(
        `/teacher/classes/${classId}/application?success=${
            intent === "publish" ? "published" : "saved"
        }`,
    );
}

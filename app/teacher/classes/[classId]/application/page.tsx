import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import type { ApplicationQuestionType } from "@/utils/application-form";
import { saveApplicationForm } from "./actions";
import {
    ApplicationEditor,
    type EditableApplicationQuestion,
} from "./application-editor";

type ApplicationBuilderPageProps = {
    params: Promise<{
        classId: string;
    }>;
    searchParams: Promise<{
        error?: string;
        success?: string;
    }>;
};

type DatabaseQuestion = {
    id: string;
    question_key: string;
    label_en: string;
    label_es: string | null;
    question_type: string;
    required: boolean;
    options: unknown;
    position: number;
    is_locked: boolean;
};

const defaultQuestions: EditableApplicationQuestion[] = [
    {
        id: "defauly-first-name",
        question_key: "first_name",
        label_en: "First name",
        label_es: "Nombre",
        question_type: "short_text",
        required: true,
        options: [],
        position: 0,
        is_locked: true,
    },
    {
        id: "default-last-name",
        question_key: "last name",
        label_en: "Last name",
        label_es: "Apellido",
        question_type: "short_text",
        required: true,
        options: [],
        position: 1,
        is_locked: true,
    },
    {
        id: "default-email",
        question_key: "email",
        label_en: "School email",
        label_es: "Correo electrónico escolar",
        question_type: "short_text",
        required: false,
        options: [],
        position: 2,
        is_locked: true,
    },
    {
        id: "default-grade",
        question_key: "grade_level",
        label_en: "Grade level",
        label_es: "Grado escolar",
        question_type: "short_text",
        required: false,
        options: [],
        position: 3,
        is_locked: true,
    },
    {
        id: "default-gpa",
        question_key: "gpa",
        label_en: "Add your GPA",
        label_es: "Ingresa tu promedio académico (GPA)",
        question_type: "number",
        required: true,
        options: [],
        position: 4,
        is_locked: true,
    },
    {
        id: "default-why-lia",
        question_key: "why_lia",
        label_en: "Why do you want to join LIA?",
        label_es: "¿Por qué quieres participar en LIA?",
        question_type: "long_text",
        required: false,
        options: [],
        position: 5,
        is_locked: false,
    },
    {
        id: "default-strengths",
        question_key: "skills_strengths",
        label_en: "What skills, interests, or strengths would you bring?",
        label_es: "¿Qué habilidades, intereses o fortalezas aportarías?",
        question_type: "long_text",
        required: false,
        options: [],
        position: 6,
        is_locked: false,
    },
    {
        id: "default-good-fit",
        question_key: "why_good_fit",
        label_en: "Why would you be a good addition to LIA?",
        label_es: "¿Por qué serías una buena adición a LIA?",
        question_type: "long_text",
        required: false,
        options: [],
        position: 7,
        is_locked: false,
    },
    {
        id: "default-activities",
        question_key: "extracurriculars",
        label_en: "List extracurricular activities or future plans.",
        label_es:
            "Enumera tus actividades extracurriculares o planes futuros.",
        question_type: "long_text",
        required: false,
        options: [],
        position: 8,
        is_locked: false,
    },
    {
        id: "default-inspiration",
        question_key: "inspiration",
        label_en: "Who or what inspires you?",
        label_es: "¿Quién o qué te inspira?",
        question_type: "long_text",
        required: false,
        options: [],
        position: 9,
        is_locked: false,
    },
    {
        id: "default-academics",
        question_key: "academic_review",
        label_en: "Describe your academic performance.",
        label_es: "Describe tu rendimiento académico.",
        question_type: "long_text",
        required: false,
        options: [],
        position: 10,
        is_locked: false,
    },
    {
        id: "default-low-grade",
        question_key: "low_grade_explanation",
        label_en:
            "If you have a low grade in any class, please explain why.",
        label_es:
            "Si tienes una calificación baja en alguna clase, explica por qué.",
        question_type: "long_text",
        required: false,
        options: [],
        position: 11,
        is_locked: false,
    },
    {
        id: "default-three-rs",
        question_key: "three_rs_review",
        label_en:
            "Reflect on being ready, respectful, and responsible.",
        label_es:
            "Reflexiona sobre cómo estar preparado, ser respetuoso y responsable.",
        question_type: "long_text",
        required: false,
        options: [],
        position: 12,
        is_locked: false,
    },
]

function getOptions(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter(
            (option): option is string => typeof option === "string",
        )
        : [];
}

function getErrorMessage(error: string | undefined) {
    switch (error) {
        case "invalid-questions":
            return "The application questions could not be read.";
        case "invalid-question-count":
            return "Applications must contain between 5 and 30 questions.";
        case "missing-question-label":
            return "Every question needs an English label.";
        case "duplicate-question-key":
            return "Two questions have the same internal identifier.";
        case "invalid-options":
            return "Multiple-choice questions need between 2 and 20 choices.";
        case "missing-required-question":
            return 'a required student field is missing.';
        case "load-failed":
            return "The current application could not be loaded.";
        case "publish-failed":
            return "The application could not be published.";
        case "save-failed":
            return "The application could not be saved.";
        default:
            return error? "Something went wrong. Please try again." : null;
    }
}

export default async function ApplicationBuilderPage({
    params,
    searchParams,
}: ApplicationBuilderPageProps) {
    const { classId } = await params;
    const { error, success } = await searchParams;
    const { supabase, profile } = await requireTeacher();
    
    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name, teacher_profile_id")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass) {
        notFound();
    }

    const { data: latestForm } = await supabase
        .from("application_forms")
        .select("id, title, intro, version, status")
        .eq("lia_class_id", classId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
    
    let questions: EditableApplicationQuestion[] = defaultQuestions;

    if (latestForm) {
        const { data: questionRows } = await supabase
            .from("application_questions")
            .select(`
                    id,
                    question_key,
                    label_en,
                    label_es,
                    question_type,
                    required,
                    options,
                    position,
                    is_locked  
                `)
            .eq("application_form_id", latestForm.id)
            .order("position", {ascending: true});
        
        if (questionRows?.length) {
            questions = (questionRows as DatabaseQuestion[]).map(
                (question) => ({
                    id: question.id,
                    question_key: question.question_key,
                    label_en: question.label_en,
                    label_es: question.label_es ?? "",
                    question_type:
                        question.question_type as ApplicationQuestionType,
                    required: question.required,
                    options: getOptions(question.options),
                    position: question.position,
                    is_locked: question.is_locked,
                }),
            );
        }
    }

    const saveForm = saveApplicationForm.bind(null, classId);
    const errorMessage = getErrorMessage(error);

    return (
        <div className="mx-auto max-w-5xl pb-16">
            <Link
                href={`/teacher/classes/${classId}/applicants`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to applicants
            </Link>

            <div className="mt-5">
                {success === "saved" ? (
                    <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        Application draft saved.
                    </div>
                ) : null}

                {success === "published" ? (
                    <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        Application published successfully.
                    </div>
                ) : null}

                {errorMessage ? (
                    <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 tet-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                <ApplicationEditor
                    action={saveForm}
                    initialTitle={
                        latestForm?.title ??
                        `${liaClass.name} Student Application`
                    }
                    initialIntro={
                        latestForm?.intro ??
                        "Complete this application if you are interested in joining LIA."
                    }
                    initialQuestions={questions}
                    currentStatus={latestForm?.status ?? "not saved"}
                    currentVersion={latestForm?.version ?? 1}
                />
            </div>
        </div>
    );
}
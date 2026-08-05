"use client";

import Link from "next/link";
import { useState } from "react";
import {
    questionInputName,
    type ApplicationQuestion,
} from "@/utils/application-form";

type Language = "en" | "es";

type ApplicationFormProps = {
    action: (formData: FormData) => void | Promise<void>;
    error?: string;
    title: string;
    intro: string;
    questions: ApplicationQuestion[] | null;
};

const translations = {
    en: {
        english: "English",
        spanish: "Español",
        differentSchool: "Choose a different school or teacher",
        chooseOption: "Choose an option",
        yes: "Yes",
        no: "No",
        submit: "Submit Application",
        errors: {
            "missing-fields": "Complete all required questions.",
            "invalid-gpa": "Enter a valid GPA between 0.00 and 5.00.",
            "file-too-large":
                "The recommendation file must be 10 MB or smaller.",
            "invalid-file-type":
                "Upload a PDF, Word document, JPG, or PNG.",
            "file-upload-failed":
                "The recommendation file could not be uploaded. Please try again.",
            closed: "This application is currently closed.",
            "already-submitted":
                "An application with this email has already been submitted for this class.",
            default: "Could not submit your application. Please try again.",
        },
    },
    es: {
        english: "English",
        spanish: "Español",
        differentSchool: "Elegir otra escuela o maestro",
        chooseOption: "Elige una opción",
        yes: "Sí",
        no: "No",
        submit: "Enviar solicitud",
        errors: {
            "missing-fields":
                "Completa todas las preguntas obligatorias.",
            "invalid-gpa": "Ingresa un GPA válido entre 0.00 y 5.00.",
            "file-too-large":
                "El archivo de recomendación debe ser de 10 MB o menos.",
            "invalid-file-type":
                "Sube un archivo PDF, Word, JPG o PNG.",
            "file-upload-failed":
                "No se pudo subir el archivo de recomendación. Inténtalo nuevamente.",
            closed: "Esta solicitud está cerrada actualmente.",
            "already-submitted":
                "Ya se envió una solicitud con este correo electrónico para esta clase.",
            default:
                "No se pudo enviar la solicitud. Inténtalo nuevamente.",
        },
    },
} as const;

const legacyQuestions: ApplicationQuestion[] = [
    {
        id: "first_name",
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
        id: "last_name",
        question_key: "last_name",
        label_en: "Last name",
        label_es: "Apellido",
        question_type: "short_text",
        required: true,
        options: [],
        position: 1,
        is_locked: true,
    },
    {
        id: "email",
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
        id: "grade_level",
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
        id: "advisory_teacher",
        question_key: "advisory_teacher",
        label_en: "Advisory teacher",
        label_es: "Maestro de asesoría",
        question_type: "short_text",
        required: false,
        options: [],
        position: 4,
        is_locked: false,
    },
    {
        id: "color_team",
        question_key: "color_team",
        label_en: "Color team / advisory group",
        label_es: "Equipo de color / grupo de asesoría",
        question_type: "short_text",
        required: false,
        options: [],
        position: 5,
        is_locked: false,
    },
    {
        id: "gpa",
        question_key: "gpa",
        label_en: "Add your GPA",
        label_es: "Ingresa tu promedio académico (GPA)",
        question_type: "number",
        required: true,
        options: [],
        position: 6,
        is_locked: true,
    },
    {
        id: "why_lia",
        question_key: "why_lia",
        label_en: "Why do you want to join LIA?",
        label_es: "¿Por qué quieres participar en LIA?",
        question_type: "long_text",
        required: false,
        options: [],
        position: 7,
        is_locked: false,
    },
    {
        id: "skills_strengths",
        question_key: "skills_strengths",
        label_en: "What skills, interests, or strengths would you bring?",
        label_es: "¿Qué habilidades, intereses o fortalezas aportarías?",
        question_type: "long_text",
        required: false,
        options: [],
        position: 8,
        is_locked: false,
    },
    {
        id: "why_good_fit",
        question_key: "why_good_fit",
        label_en: "Why would you be a good addition to LIA?",
        label_es: "¿Por qué serías una buena adición a LIA?",
        question_type: "long_text",
        required: false,
        options: [],
        position: 9,
        is_locked: false,
    },
    {
        id: "extracurriculars",
        question_key: "extracurriculars",
        label_en: "List extracurricular activities or future plans.",
        label_es:
            "Enumera tus actividades extracurriculares o planes futuros.",
        question_type: "long_text",
        required: false,
        options: [],
        position: 10,
        is_locked: false,
    },
    {
        id: "inspiration",
        question_key: "inspiration",
        label_en: "Who or what inspires you?",
        label_es: "¿Quién o qué te inspira?",
        question_type: "long_text",
        required: false,
        options: [],
        position: 11,
        is_locked: false,
    },
    {
        id: "academic_review",
        question_key: "academic_review",
        label_en: "Describe your academic performance.",
        label_es: "Describe tu rendimiento académico.",
        question_type: "long_text",
        required: false,
        options: [],
        position: 12,
        is_locked: false,
    },
    {
        id: "low_grade_explanation",
        question_key: "low_grade_explanation",
        label_en:
            "If you have a low grade in any class, please explain why.",
        label_es:
            "Si tienes una calificación baja en alguna clase, explica por qué.",
        question_type: "long_text",
        required: false,
        options: [],
        position: 13,
        is_locked: false,
    },
    {
        id: "three_rs_review",
        question_key: "three_rs_review",
        label_en:
            "Reflect on being ready, respectful, and responsible.",
        label_es:
            "Reflexiona sobre cómo estar preparado, ser respetuoso y responsable.",
        question_type: "long_text",
        required: false,
        options: [],
        position: 14,
        is_locked: false,
    },
];

export default function ApplicationForm({
    action,
    error,
    title,
    intro,
    questions,
}: ApplicationFormProps) {
    const [language, setLanguage] = useState<Language>("en");
    const text = translations[language];
    const displayedQuestions = questions ?? legacyQuestions;
    const isCustomForm = questions !== null;

    const errorMessage = error
        ? text.errors[error as keyof typeof text.errors] ??
          text.errors.default
        : null;

    const inputClass =
        "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100";

    const textareaClass =
        "mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100";

    return (
        <>
            <div className="flex justify-end">
                <div className="inline-flex rounded-md border border-zinc-300 p-1">
                    {(["en", "es"] as const).map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setLanguage(option)}
                            className={`h-9 px-4 text-sm font-semibold ${
                                language === option
                                    ? "rounded bg-[#c4122f] text-white"
                                    : "text-zinc-600"
                            }`}
                        >
                            {option === "en"
                                ? text.english
                                : text.spanish}
                        </button>
                    ))}
                </div>
            </div>

            <h1 className="mt-4 text-3xl font-semibold">{title}</h1>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
                {intro}
            </p>

            {errorMessage ? (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            <Link
                href="/apply"
                className="mt-5 inline-block text-sm font-semibold text-[#c4122f]"
            >
                {text.differentSchool}
            </Link>

            <form action={action} className="mt-6 space-y-5">
                <input type="hidden" name="language" value={language} />

                {displayedQuestions.map((question) => {
                    const label =
                        language === "es" && question.label_es
                            ? question.label_es
                            : question.label_en;

                    const name = isCustomForm
                        ? questionInputName(question.id)
                        : question.question_key;

                    if (question.question_type === "file_upload") {
                        return (
                            <label
                                key={question.id}
                                className="block rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold"
                            >
                                {label}

                                {question.required ? (
                                    <span className="ml-1 text-[#c4122f]">*</span>
                                ): null}

                                <input
                                    name={name}
                                    type="file"
                                    required={question.required}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm font-normal outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[#c4122f] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#a70d25] focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                                />

                                <span className="mt-2 block text-xs font-normal leading-5 text-zinc-500">
                                    Upload a PDF, Word document, JPG, or PNG. Maximum
                                    file size: 10 MB.
                                </span>
                            </label>
                        );
                    }

                    if (question.question_type === "long_text") {
                        return (
                            <label
                                key={question.id}
                                className="block text-sm font-semibold"
                            >
                                {label}

                                {question.required ? (
                                    <span className="ml-1 text-[#c4122f]">
                                        *
                                    </span>
                                ) : null}

                                <textarea
                                    name={name}
                                    rows={4}
                                    required={question.required}
                                    className={textareaClass}
                                />
                            </label>
                        );
                    }

                    if (
                        question.question_type === "multiple_choice"
                    ) {
                        return (
                            <label
                                key={question.id}
                                className="block text-sm font-semibold"
                            >
                                {label}

                                {question.required ? (
                                    <span className="ml-1 text-[#c4122f]">
                                        *
                                    </span>
                                ) : null}

                                <select
                                    name={name}
                                    required={question.required}
                                    className={inputClass}
                                >
                                    <option value="">
                                        {text.chooseOption}
                                    </option>

                                    {question.options.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        );
                    }

                    if (question.question_type === "yes_no") {
                        return (
                            <fieldset
                                key={question.id}
                                className="rounded-md border border-zinc-200 p-4"
                            >
                                <legend className="px-1 text-sm font-semibold">
                                    {label}

                                    {question.required ? (
                                        <span className="ml-1 text-[#c4122f]">
                                            *
                                        </span>
                                    ) : null}
                                </legend>

                                <div className="mt-2 flex gap-6">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name={name}
                                            value="yes"
                                            required={question.required}
                                            className="accent-[#c4122f]"
                                        />
                                        {text.yes}
                                    </label>

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name={name}
                                            value="no"
                                            className="accent-[#c4122f]"
                                        />
                                        {text.no}
                                    </label>
                                </div>
                            </fieldset>
                        );
                    }

                    const isGpa = question.question_key === "gpa";
                    const isEmail =
                        question.question_key === "email";

                    return (
                        <label
                            key={question.id}
                            className="block text-sm font-semibold"
                        >
                            {label}

                            {question.required ? (
                                <span className="ml-1 text-[#c4122f]">
                                    *
                                </span>
                            ) : null}

                            <input
                                name={name}
                                type={
                                    isEmail
                                        ? "email"
                                        : question.question_type ===
                                            "number"
                                          ? "number"
                                          : "text"
                                }
                                min={isGpa ? "0" : undefined}
                                max={isGpa ? "5" : undefined}
                                step={isGpa ? "0.01" : undefined}
                                required={question.required}
                                className={inputClass}
                            />
                        </label>
                    );
                })}

                <button
                    type="submit"
                    className="h-11 rounded-md bg-[#c4122f] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                >
                    {text.submit}
                </button>
            </form>
        </>
    );
}

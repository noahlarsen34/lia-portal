"use client";

import { errorMonitor } from "events";
import Link from "next/link";
import { useState } from "react";

type Language = "en" | "es";

type ApplicationFormProps = {
    action: (formData: FormData) => void | Promise<void>;
    error?: string;
};

const translations = {
    en: {
        title: "Student Application",
        intro: "Complete this application if you are interested in joining LIA.",
        english: "English",
        spanish: "Espańol",
        differentSchool: "Choose a different school or teacher",
        firstName: "First name",
        lastName: "Last name",
        email: "School email",
        grade: "Grade level",
        advisoryTeacher: "Advisory teacher",
        colorTeam: "Color team / advisory group",
        gpa: "Add your GPA",
        gpaPlaceholder: "For example, 3.25",
        whyLia: "Why do you want to join LIA?",
        strengths: "What skills, interests, or strengths would you bring?",
        goodFit: "Why would you be a good addition to LIA?",
        activities: "List extracurricular activities or future plans.",
        inspiration: "Who or what inspires you?",
        academics: "Describe your academic performance.",
        lowGrade: "If you have a low grade in any class, please explain why.",
        lowGradePlaceholder:
            "Share any circumstances or challenges that affected your grade. Leave this blank if it does not apply.",
        threeRs: "Reflect on being ready, respectful, and responsible.",
        submit: "Submit Application",
        errors: {
            "missing-fields": "First name, last name, and GPA are required.",
            "invalid-gpa": "Enter a valid GPA between 0.00 and 5.00.",
            closed: "This application is currently closed.",
            "already-submitted":
                "An application with this email has already been submitted for this class.",
            default: "Could not submit your application. Please try again.",
        },
    },
    es: {
        title: "Solicitud Estudiantil",
        intro: "Completa esta solicitud si te interesa participar en LIA.",
        english: "English",
        spanish: "Español",
        differentSchool: "Elegir otra escuela o maestro",
        firstName: "Nombre",
        lastName: "Apellido",
        email: "Correo electrónico escolar",
        grade: "Grado escolar",
        advisoryTeacher: "Maestro de asesoría",
        colorTeam: "Equipo de color / grupo de asesoría",
        gpa: "Ingresa tu promedio académico (GPA)",
        gpaPlaceholder: "Por ejemplo, 3.25",
        whyLia: "¿Por qué quieres participar en LIA?",
        strengths: "¿Qué habilidades, intereses o fortalezas aportarías?",
        goodFit: "¿Por qué serías una buena adición a LIA?",
        activities: "Enumera tus actividades extracurriculares o planes futuros.",
        inspiration: "¿Quién o qué te inspira?",
        academics: "Describe tu rendimiento académico.",
        lowGrade: "Si tienes una calificación baja en alguna clase, explica por qué.",
        lowGradePlaceholder:
            "Comparte cualquier circunstancia o dificultad que haya afectado tu calificación. Déjalo en blanco si no corresponde.",
        threeRs:
            "Reflexiona sobre cómo estar preparado, ser respetuoso y responsable.",
        submit: "Enviar solicitud",
        errors: {
            "missing-fields": "El nombre, apellido y GPA son obligatorios.",
            "invalid-gpa": "Ingresa un GPA válido entre 0.00 y 5.00.",
            closed: "Esta solicitud está cerrada actualmente.",
            "already-submitted":
                "Ya se envió una solicitud con este correo electrónico para esta clase.",
            default: "No se pudo enviar la solicitud. Inténtalo nuevamente.",
        },
    } 
} as const; 

const textareas = [
    ["why_lia", "whyLia"],
    ["skills_strengths", "strengths"],
    ["why_good_fit", "goodFit"],
    ["extracurriculars", "activities"],
    ["inspiration", "inspiration"],
    ["academic_review", "academics"],
    ["three_rs_review", "threeRs"],
] as const;

export default function ApplicationForm({
    action,
    error,
}: ApplicationFormProps) {
    const [language, setLanguage] = useState<Language>("en");
    const text = translations[language];

    const errorMessage = error
        ? text.errors[error as keyof typeof text.errors] ?? text.errors.default
        : null;
    
    const inputClass =
        "h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950";
    const textareaClass =
        "mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950";
    
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
                            {option === "en" ? text.english : text.spanish}
                        </button>
                    ))}
                </div>
            </div>

            <h1 className="mt-4 text-3xl font-semibold">{text.title}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{text.intro}</p>

            {errorMessage ? (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            ): null}

            <Link
                href="/apply"
                className="mt-5 inline-block text-sm font-semibold text-[#c4122f]"
            >
                {text.differentSchool}
            </Link>

            <form action={action} className="mt-6 space-y-5">
                <input type="hidden" name="language" value={language} />

                <div className="grid gap-5 sm:grid-cols-2">
                    <input name="first_name" required placeholder={text.firstName} className={inputClass} />
                    <input name="last_name" required placeholder={text.lastName} className={inputClass} />
                    <input name="email" type="email" placeholder={text.email} className={inputClass} />
                    <input name="grade_level" placeholder={text.grade} className={inputClass} />
                </div>

                <input name="adivsory_teacher" placeholder={text.advisoryTeacher} className={inputClass} />
                <input name="color_team" placeholder={text.colorTeam} className={inputClass} />

                <label className="block text-sm font-semibold">
                    {text.gpa}
                    <input
                        name="gpa"
                        type="number"
                        min="0"
                        max="5"
                        step="0.01"
                        required
                        placeholder={text.gpaPlaceholder}
                        className={`mt-2 ${inputClass}`}
                    />
                </label>

                {textareas.slice(0,6).map(([name, key]) => (
                    <label key={name} className="block text-sm font-semibold">
                        {text[key]}
                        <textarea name={name} rows={4} className={textareaClass} />
                    </label>
                ))}

                <label className="block text-sm font-semibold">
                    {text.lowGrade}
                    <textarea
                        name="low_grade_explanation"
                        rows={4}
                        placeholder={text.lowGradePlaceholder}
                        className={textareaClass}
                    />
                </label> 

                <label className="block text-sm font-semibold">
                    {text.threeRs}
                    <textarea name="three_rs_review" rows={4} className={textareaClass} />
                </label>

                <button className="h-11 rounded-md bg-[#c4122f] px-5 text-sm font-semibold text-white">
                    {text.submit}
                </button>
            </form>
        </> 
    );
}
"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ApplicationQuestionType } from "@/utils/application-form";

export type EditableApplicationQuestion = {
    id: string;
    question_key: string;
    label_en: string;
    label_es: string;
    question_type: ApplicationQuestionType;
    required: boolean;
    options: string[];
    position: number;
    is_locked: boolean;
};

type ApplicationEditorProps = {
    action: (formData: FormData) => void | Promise<void>;
    initialTitle: string;
    initialIntro: string;
    initialQuestions: EditableApplicationQuestion[];
    currentStatus: string;
    currentVersion: number;
};

const inputClass = 
    "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100";

function createQuestion(): EditableApplicationQuestion {
    const id =
        typeof crypto !== "undefined" && "randonUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        
        return {
            id,
            question_key: `custom_${id.replace(/[^a-zA-Z0-9]/g, "_")}`,
            label_en: "New question",
            label_es: "",
            question_type: "long_text",
            required: false,
            options: [],
            position: 0,
            is_locked: false,
        };
}

export function ApplicationEditor({
    action,
    initialTitle,
    initialIntro,
    initialQuestions,
    currentStatus,
    currentVersion,
}: ApplicationEditorProps) {
    const [questions, setQuestions] = useState(initialQuestions);

    const updateQuestion = (
        id: string,
        updates: Partial<EditableApplicationQuestion>,
    ) => {
        setQuestions((current) =>
            current.map((question) =>
                question.id === id
                    ? {
                          ...question,
                          ...updates,
                      }
                    : question,
            ),
        );
    };

    const moveQuestion = (index: number, direction: -1 | 1) => {
        const nextIndex = index + direction;

        if (nextIndex < 0 || nextIndex >= questions.length) {
            return;
        }

        setQuestions((current) => {
            const updated = [...current];
            const [question] = updated.splice(index, 1);
            updated.splice(nextIndex, 0, question);
            return updated;
        });
    };

    const deleteQuestion = (id: string) => {
        setQuestions((current) =>
            current.filter(
                (question) => question.id !== id || question.is_locked,
            ),
        );
    };

    const addQuestion = () => {
        setQuestions((current) => [
            ...current,
            {
                ...createQuestion(),
                position: current.length,
            },
        ]);
    };

    const serializedQuestions = questions.map((question, index) => ({
        ...question,
        position: index,
    }));

    return (
        <form action={action}>
            <input
                type="hidden"
                name="questions"
                value={JSON.stringify(serializedQuestions)}
            />

            <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Customize Application
                        </h1>

                        <p className="mt-2 text-sm text-zinc-600">
                            Edit the questions students answer when applying to
                            this class.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold capitalize text-zinc-700">
                            {currentStatus}
                        </span>

                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#c4122f]">
                            Version {currentVersion}
                        </span>
                    </div>
                </div>

                {currentStatus === "published" ? (
                    <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This version is published. Saving changes will create a
                        new draft so existing submissions remain unchanged.
                    </div>
                ) : null}

                <div className="mt-6 grid gap-5">
                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-800">
                            Application title
                        </span>

                        <input
                            name="title"
                            required
                            maxLength={150}
                            defaultValue={initialTitle}
                            className={inputClass}
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-800">
                            Instructions
                        </span>

                        <textarea
                            name="intro"
                            rows={3}
                            maxLength={1000}
                            defaultValue={initialIntro}
                            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                        />
                    </label>
                </div>
            </section>

            <section className="mt-5 space-y-4">
                {questions.map((question, index) => (
                    <article
                        key={question.id}
                        className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Question {index + 1}
                                </p>

                                {question.is_locked ? (
                                    <p className="mt-1 text-xs font-medium text-[#c4122f]">
                                        Required student field
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => moveQuestion(index, -1)}
                                    disabled={index === 0}
                                    className="rounded-md border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
                                    aria-label="Move question up"
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => moveQuestion(index, 1)}
                                    disabled={index === questions.length - 1}
                                    className="rounded-md border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
                                    aria-label="Move question down"
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </button>

                                {!question.is_locked ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            deleteQuestion(question.id)
                                        }
                                        className="rounded-md border border-red-200 p-2 text-[#c4122f] hover:bg-red-50"
                                        aria-label="Delete question"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    English question
                                </span>

                                <input
                                    value={question.label_en}
                                    onChange={(event) =>
                                        updateQuestion(question.id, {
                                            label_en: event.target.value,
                                        })
                                    }
                                    maxLength={300}
                                    required
                                    className={inputClass}
                                />
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    Spanish question
                                    <span className="ml-1 font-normal text-zinc-500">
                                        Optional
                                    </span>
                                </span>

                                <input
                                    value={question.label_es}
                                    onChange={(event) =>
                                        updateQuestion(question.id, {
                                            label_es: event.target.value,
                                        })
                                    }
                                    maxLength={300}
                                    className={inputClass}
                                />
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    Answer type
                                </span>

                                <select
                                    value={question.question_type}
                                    disabled={question.is_locked}
                                    onChange={(event) =>
                                        updateQuestion(question.id, {
                                            question_type: event.target
                                                .value as ApplicationQuestionType,
                                            options:
                                                event.target.value ===
                                                "multiple_choice"
                                                    ? question.options.length >= 2
                                                        ? question.options
                                                        : ["Option 1", "Option 2"]
                                                    : [],
                                        })
                                    }
                                    className={`${inputClass} disabled:bg-zinc-100 disabled:text-zinc-500`}
                                >
                                    <option value="short_text">
                                        Short answer
                                    </option>
                                    <option value="long_text">
                                        Long answer
                                    </option>
                                    <option value="number">Number</option>
                                    <option value="multiple_choice">
                                        Multiple choice
                                    </option>
                                    <option value="yes_no">Yes / No</option>
                                    <option value="file_upload">File upload</option>
                                </select>
                            </label>

                            <label className="flex items-center gap-3 self-end rounded-md border border-zinc-200 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={question.required}
                                    disabled={question.is_locked}
                                    onChange={(event) =>
                                        updateQuestion(question.id, {
                                            required: event.target.checked,
                                        })
                                    }
                                    className="h-4 w-4 accent-[#c4122f]"
                                />

                                <span className="text-sm font-semibold text-zinc-700">
                                    Required question
                                </span>
                            </label>
                        </div>

                        {question.question_type === "multiple_choice" ? (
                            <label className="mt-4 block">
                                <span className="text-sm font-semibold text-zinc-800">
                                    Choices
                                </span>

                                <span className="ml-2 text-xs text-zinc-500">
                                    Enter one choice per line
                                </span>

                                <textarea
                                    value={question.options.join("\n")}
                                    onChange={(event) =>
                                        updateQuestion(question.id, {
                                            options: event.target.value
                                                .split("\n")
                                                .map((option) => option.trim())
                                                .filter(Boolean),
                                        })
                                    }
                                    rows={5}
                                    className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                                />
                            </label>
                        ) : null}
                    </article>
                ))}
            </section>

            <button
                type="button"
                onClick={addQuestion}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-md border border-dashed border-red-300 bg-red-50 px-4 text-sm font-semibold text-[#c4122f] hover:bg-red-100"
            >
                <Plus className="h-4 w-4" />
                Add Question
            </button>

            <div className="sticky bottom-4 mt-6 flex flex-wrap justify-end gap-3 rounded-md border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                <button
                    type="submit"
                    name="intent"
                    value="draft"
                    className="h-11 rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                    Save Draft
                </button>

                <button
                    type="submit"
                    name="intent"
                    value="publish"
                    className="h-11 rounded-md bg-[#c4122f] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                >
                    Publish Application
                </button>
            </div>
        </form>
    );
}

        

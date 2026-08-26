"use client";

import Image from "next/image";
import { CheckCircle2, ExternalLink, Upload } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

const INTERMOUNTAIN_SURVEY_URL =
    "https://ihmacx.sjc1.qualtrics.com/jfe/form/SV_80wsx5K7KOyOqEK?Q_CHL=qr";
const MAX_FILE_SIZE = 100 * 1024 * 1024;

type EnrollmentOption = {
    id: string;
    name: string;
};

type IntermountainAssignmentFormProps = {
    token: string;
    enrollments: EnrollmentOption[];
};

const fieldClasses =
    "mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-950 outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100";

export function IntermountainAssignmentForm({
    token,
    enrollments,
}: IntermountainAssignmentFormProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        const form = event.currentTarget;
        const formData = new FormData(form);
        const enrollmentId = String(
            formData.get("studentEnrollmentId") ?? "",
        );
        const fileValue = formData.get("evidence");

        if (!(fileValue instanceof File) || fileValue.size === 0) {
            setError("Upload your final reflection document or video.");
            setSubmitting(false);
            return;
        }

        if (fileValue.size > MAX_FILE_SIZE) {
            setError("The uploaded file must be 100 MB or smaller.");
            setSubmitting(false);
            return;
        }

        const responses = {
            emotionalWellbeing: String(
                formData.get("emotionalWellbeing") ?? "",
            ).trim(),
            threeSteps: String(
                formData.get("threeSteps") ?? "",
            ).trim(),
            healthyStrategy: String(
                formData.get("healthyStrategy") ?? "",
            ).trim(),
            helpingSomeone: String(
                formData.get("helpingSomeone") ?? "",
            ).trim(),
            suggestions: String(
                formData.get("suggestions") ?? "",
            ).trim(),
        };

        try {
            const prepareResponse = await fetch(
                `/api/microcredentials/${encodeURIComponent(token)}/intermountain`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "prepare",
                        enrollmentId,
                        fileName: fileValue.name,
                        fileType: fileValue.type,
                        fileSize: fileValue.size,
                    }),
                },
            );

            const preparePayload = await prepareResponse.json();

            if (!prepareResponse.ok) {
                throw new Error(
                    preparePayload.error ||
                        "The upload could not be started.",
                );
            }

            const supabase = createClient();
            const { error: uploadError } = await supabase.storage
                .from("microcredential-submissions")
                .uploadToSignedUrl(
                    preparePayload.filePath,
                    preparePayload.token,
                    fileValue,
                    { contentType: fileValue.type },
                );

            if (uploadError) {
                throw new Error(
                    "The evidence file could not be uploaded. Please try again.",
                );
            }

            const completeResponse = await fetch(
                `/api/microcredentials/${encodeURIComponent(token)}/intermountain`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "complete",
                        enrollmentId,
                        fileName: fileValue.name,
                        fileType: fileValue.type,
                        fileSize: fileValue.size,
                        filePath: preparePayload.filePath,
                        responses,
                    }),
                },
            );

            const completePayload = await completeResponse.json();

            if (!completeResponse.ok) {
                throw new Error(
                    completePayload.error ||
                        "The assignment could not be saved.",
                );
            }

            form.reset();
            setSubmitted(true);
        } catch (submissionError) {
            setError(
                submissionError instanceof Error
                    ? submissionError.message
                    : "The assignment could not be submitted.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (submitted) {
        return (
            <section className="rounded-2xl border border-green-200 bg-green-50 p-6 text-green-900">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                    <div>
                        <h2 className="text-xl font-bold">
                            Assignment submitted
                        </h2>
                        <p className="mt-2 text-sm leading-6">
                            Your emotional well-being reflection and evidence
                            file were sent to your teacher for review.
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            id="intermountain-assignment"
            className="scroll-mt-6 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm"
        >
            <header className="bg-gradient-to-br from-[#a90d29] to-[#d7193f] p-6 text-white sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                    Standard LIA microcredential
                </p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                    Intermountain Health: Emotional Well-Being Training
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">
                    Complete the Intermountain Health survey first, then answer
                    the LIA reflection questions and upload evidence of your
                    final teaching reflection.
                </p>
            </header>

            <div className="space-y-8 p-6 sm:p-8">
                <section className="grid items-center gap-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                        <Image
                            src="/microcredentials/intermountain-survey-qr.png"
                            alt="QR code for the Intermountain Health survey"
                            width={673}
                            height={667}
                            className="h-auto w-full"
                        />
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#c4122f]">
                            Step 1
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-zinc-950">
                            Complete the Intermountain Health survey
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                            Scan the QR code or use the button below. Return to
                            this page after completing the survey.
                        </p>
                        <a
                            href={INTERMOUNTAIN_SURVEY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Open Intermountain survey
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                </section>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#c4122f]">
                            Step 2
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-zinc-950">
                            Submit your LIA reflection
                        </h3>
                    </div>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-800">
                            Student name
                        </span>
                        <select
                            name="studentEnrollmentId"
                            required
                            defaultValue=""
                            className={fieldClasses}
                        >
                            <option value="" disabled>
                                Select your name
                            </option>
                            {enrollments.map((enrollment) => (
                                <option
                                    key={enrollment.id}
                                    value={enrollment.id}
                                >
                                    {enrollment.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                        <input
                            type="checkbox"
                            required
                            className="mt-0.5 h-5 w-5 shrink-0"
                        />
                        <span>
                            I completed the Intermountain Health survey in
                            Step 1.
                        </span>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-800">
                            What does emotional well-being mean to you after
                            completing this training?
                        </span>
                        <textarea
                            name="emotionalWellbeing"
                            required
                            minLength={10}
                            maxLength={5000}
                            rows={4}
                            className={fieldClasses}
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-800">
                            What are the three steps for managing emotional
                            health, and why are they important?
                        </span>
                        <textarea
                            name="threeSteps"
                            required
                            minLength={10}
                            maxLength={5000}
                            rows={4}
                            className={fieldClasses}
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-800">
                            What is one healthy strategy you can use when you
                            are experiencing difficult emotions? Why would it
                            help?
                        </span>
                        <textarea
                            name="healthyStrategy"
                            required
                            minLength={10}
                            maxLength={5000}
                            rows={4}
                            className={fieldClasses}
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-800">
                            What would you do if a friend or family member told
                            you they were struggling emotionally?
                        </span>
                        <textarea
                            name="helpingSomeone"
                            required
                            minLength={10}
                            maxLength={5000}
                            rows={4}
                            className={fieldClasses}
                        />
                    </label>

                    <label className="block rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                        <span className="text-sm font-semibold text-zinc-900">
                            Final reflection evidence
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-zinc-600">
                            Write a five-line paragraph or record a video about
                            teaching someone one topic from the training. Tell
                            us who you taught, what you shared, how the
                            conversation went, and how confident you felt.
                            Upload the document or video below.
                        </span>
                        <input
                            type="file"
                            name="evidence"
                            required
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mov,.webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,video/mp4,video/quicktime,video/webm"
                            className={fieldClasses}
                        />
                        <span className="mt-2 block text-xs text-zinc-500">
                            PDF, Word, JPG, PNG, MP4, MOV, or WebM. Maximum size:
                            100 MB.
                        </span>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-zinc-800">
                            Ideas or suggestions (optional)
                        </span>
                        <textarea
                            name="suggestions"
                            maxLength={5000}
                            rows={3}
                            className={fieldClasses}
                        />
                    </label>

                    {error ? (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c4122f] px-5 font-semibold text-white hover:bg-[#a70d25] disabled:cursor-wait disabled:opacity-60"
                    >
                        <Upload className="h-5 w-5" />
                        {submitting
                            ? "Uploading and submitting..."
                            : "Submit LIA reflection"}
                    </button>
                </form>
            </div>
        </section>
    );
}

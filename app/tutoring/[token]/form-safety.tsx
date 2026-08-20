"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";

const STORAGE_PREFIX = "lia-tutoring-form:";

export function TutoringFormPersistence({
    token,
    submitted,
    hasError,
}: {
    token: string;
    submitted: boolean;
    hasError: boolean;
}) {
    useEffect(() => {
        const storageKey = `${STORAGE_PREFIX}${token}`;
        const form = document.querySelector<HTMLFormElement>(
            "form[data-tutoring-form]",
        );

        if (!form) return;

        if (submitted) {
            sessionStorage.removeItem(storageKey);
            return;
        }

        try {
            const saved = JSON.parse(
                sessionStorage.getItem(storageKey) || "{}",
            ) as Record<string, string>;

            for (const element of Array.from(form.elements)) {
                if (
                    !(element instanceof HTMLInputElement) &&
                    !(element instanceof HTMLSelectElement) &&
                    !(element instanceof HTMLTextAreaElement)
                ) {
                    continue;
                }

                if (
                    !element.name ||
                    element instanceof HTMLInputElement &&
                        (element.type === "file" ||
                            element.type === "submit")
                ) {
                    continue;
                }

                if (saved[element.name] !== undefined) {
                    element.value = saved[element.name];
                }
            }
        } catch {
            sessionStorage.removeItem(storageKey);
        }

        const saveForm = () => {
            const values: Record<string, string> = {};

            for (const element of Array.from(form.elements)) {
                if (
                    !(element instanceof HTMLInputElement) &&
                    !(element instanceof HTMLSelectElement) &&
                    !(element instanceof HTMLTextAreaElement)
                ) {
                    continue;
                }

                if (
                    !element.name ||
                    element instanceof HTMLInputElement &&
                        (element.type === "file" ||
                            element.type === "submit")
                ) {
                    continue;
                }

                values[element.name] = element.value;
            }

            sessionStorage.setItem(storageKey, JSON.stringify(values));
        };

        form.addEventListener("input", saveForm);
        form.addEventListener("change", saveForm);
        form.addEventListener("submit", saveForm);

        if (hasError) {
            requestAnimationFrame(() => {
                document
                    .getElementById("tutoring-form-error")
                    ?.focus({ preventScroll: false });
            });
        }

        return () => {
            form.removeEventListener("input", saveForm);
            form.removeEventListener("change", saveForm);
            form.removeEventListener("submit", saveForm);
        };
    }, [hasError, submitted, token]);

    return null;
}

export function SubmitTutoringLogButton() {
    const { pending } = useFormStatus();

    return (
        <div aria-live="polite">
            <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-[#c4122f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
                {pending ? "Submitting… Please wait" : "Submit Log"}
            </button>

            {pending ? (
                <p className="mt-2 text-sm font-medium text-zinc-600">
                    Your proof file is uploading. Do not close this page or
                    press Submit again.
                </p>
            ) : null}
        </div>
    );
}

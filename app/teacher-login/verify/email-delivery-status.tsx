"use client";

import { useEffect, useState } from "react";
import { resendTeacherCode } from "../actions";

type DeliveryStatus =
    | "checking"
    | "pending"
    | "sent"
    | "delivered"
    | "delayed"
    | "rejected";

type StatusContent = {
    title: string;
    message: string;
    className: string;
};

const statusContent: Record<DeliveryStatus, StatusContent> = {
    checking: {
        title: "Checking delivery status",
        message: "We are checking whether your school email system received the code.",
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
    },
    pending: {
        title: "Code requested",
        message: "The email is still being processed. This can take a few minutes on school email systems.",
        className: "border-blue-200 bg-blue-50 text-blue-800",
    },
    sent: {
        title: "Code sent to the email provider",
        message: "We are waiting for your school email system to confirm delivery.",
        className: "border-blue-200 bg-blue-50 text-blue-800",
    },
    delivered: {
        title: "Accepted by your school email system",
        message: "The district server accepted the message, but it may still route it to spam, junk, or quarantine. Check all of those folders.",
        className: "border-green-200 bg-green-50 text-green-800",
    },
    delayed: {
        title: "Delivery is delayed",
        message: "Your school email system has temporarily delayed the message. Wait a few minutes before requesting another code.",
        className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    rejected: {
        title: "Your school email system rejected the code",
        message: "Ask your district email administrator to allow messages from no-reply@mail.lia-portal.org, or contact LIA support for help.",
        className: "border-red-200 bg-red-50 text-red-800",
    },
};

type EmailDeliveryStatusProps = {
    maskedEmail: string;
    recipientEmail: string;
};

export function EmailDeliveryStatus({
    maskedEmail,
    recipientEmail,
}: EmailDeliveryStatusProps) {
    const [status, setStatus] = useState<DeliveryStatus>("checking");
    const [referenceCode, setReferenceCode] = useState<string | null>(null);
    const [requestedAt, setRequestedAt] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(60);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let isActive = true;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        async function checkStatus() {
            let continuePolling = true;

            try {
                const response = await fetch(
                    "/api/teacher-login/email-status",
                    { cache: "no-store" },
                );

                if (!response.ok) {
                    if (isActive) {
                        setStatus("pending");
                    }
                    return;
                }

                const result = (await response.json()) as {
                    status?: DeliveryStatus;
                    referenceCode?: string | null;
                    requestedAt?: string | null;
                };

                if (
                    isActive &&
                    result.status &&
                    result.status !== "checking"
                ) {
                    setStatus(result.status);
                    continuePolling =
                        result.status !== "delivered" &&
                        result.status !== "rejected";
                }

                if (isActive) {
                    setReferenceCode(result.referenceCode ?? null);
                    setRequestedAt(result.requestedAt ?? null);

                    if (result.requestedAt) {
                        const elapsedSeconds = Math.floor(
                            (Date.now() - new Date(result.requestedAt).getTime()) /
                                1000,
                        );
                        setCooldown(Math.max(0, 60 - elapsedSeconds));
                    }
                }
            } catch {
                if (isActive) {
                    setStatus("pending");
                }
            } finally {
                if (isActive && continuePolling) {
                    timeoutId = setTimeout(checkStatus, 5000);
                }
            }
        }

        void checkStatus();

        return () => {
            isActive = false;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    useEffect(() => {
        if (cooldown <= 0) {
            return;
        }

        const intervalId = setInterval(() => {
            setCooldown((current) => Math.max(0, current - 1));
        }, 1000);

        return () => clearInterval(intervalId);
    }, [cooldown]);

    const content = statusContent[status];
    const formattedRequestedAt = requestedAt
        ? new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
          }).format(new Date(requestedAt))
        : "Pending";
    const supportDetails = [
        "LIA Teacher Portal email delivery issue",
        `Reference: ${referenceCode ?? "Pending"}`,
        "Sender: no-reply@mail.lia-portal.org",
        `Recipient: ${recipientEmail}`,
        "Subject: Your LIA Portal Login Code",
        `Requested: ${formattedRequestedAt}`,
        "Please check the district message trace, quarantine, and mail-flow rules, and allowlist mail.lia-portal.org.",
    ].join("\n");

    async function copySupportDetails() {
        try {
            await navigator.clipboard.writeText(supportDetails);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className="mb-5 space-y-4">
            <div
                className={`rounded-md border px-4 py-3 text-sm ${content.className}`}
                role="status"
                aria-live="polite"
            >
                <p className="font-semibold">{content.title}</p>
                <p className="mt-1 leading-5">{content.message}</p>
                {referenceCode ? (
                    <p className="mt-2 text-xs font-semibold">
                        Support reference: {referenceCode}
                    </p>
                ) : null}
            </div>

            <form action={resendTeacherCode}>
                <button
                    type="submit"
                    disabled={cooldown > 0}
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#c8102e] bg-white px-4 text-sm font-semibold text-[#c8102e] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400"
                >
                    {cooldown > 0
                        ? `Request another code in ${cooldown}s`
                        : "Request Another Code"}
                </button>
                <p className="mt-2 text-center text-xs leading-5 text-zinc-500">
                    Requesting another code may make an older code stop working.
                    Always use the newest code you receive for {maskedEmail}.
                </p>
            </form>

            {(status === "delayed" || status === "rejected") && (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm">
                    <p className="font-semibold text-zinc-900">
                        Details for district IT
                    </p>
                    <dl className="mt-3 grid gap-2 text-xs text-zinc-600">
                        <div>
                            <dt className="font-semibold text-zinc-800">Reference</dt>
                            <dd>{referenceCode ?? "Pending"}</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-zinc-800">Sender</dt>
                            <dd className="break-all">no-reply@mail.lia-portal.org</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-zinc-800">Requested</dt>
                            <dd>{formattedRequestedAt}</dd>
                        </div>
                    </dl>
                    <button
                        type="button"
                        onClick={copySupportDetails}
                        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                    >
                        {copied ? "Copied" : "Copy Troubleshooting Details"}
                    </button>
                </div>
            )}
        </div>
    );
}

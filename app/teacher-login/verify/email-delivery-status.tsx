"use client";

import { useEffect, useState } from "react";

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
        title: "Delivered to your school email system",
        message: "Check your inbox, spam, junk, and quarantine folders. School filters can still move the message after accepting it.",
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

export function EmailDeliveryStatus() {
    const [status, setStatus] = useState<DeliveryStatus>("checking");

    useEffect(() => {
        let isActive = true;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        async function checkStatus() {
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
                };

                if (
                    isActive &&
                    result.status &&
                    result.status !== "checking"
                ) {
                    setStatus(result.status);
                }
            } catch {
                if (isActive) {
                    setStatus("pending");
                }
            } finally {
                if (isActive) {
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

    const content = statusContent[status];

    return (
        <div
            className={`mb-5 rounded-md border px-4 py-3 text-sm ${content.className}`}
            role="status"
            aria-live="polite"
        >
            <p className="font-semibold">{content.title}</p>
            <p className="mt-1 leading-5">{content.message}</p>
        </div>
    );
}


"use client";

import { useEffect, useState } from "react";
import { Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { toDataURL } from "qrcode"; 

type EventRegistrationShareProps = {
    eventName: string;
    registrationPath: string;
    registrationOpen: boolean;
    registrationCount: number;
};

export function EventRegistrationShare({
    eventName,
    registrationPath,
    registrationOpen,
    registrationCount,
}: EventRegistrationShareProps) {
    const [registrationUrl, setRegistrationUrl] = useState("");
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function createQrCode() {
            try {
                const absoluteRegistrationUrl = new URL(
                    registrationPath,
                    window.location.origin,
                ).toString();

                setRegistrationUrl(absoluteRegistrationUrl);

                const dataUrl = await toDataURL(
                    absoluteRegistrationUrl,
                    {
                        width: 500,
                        margin: 2,
                        errorCorrectionLevel: "H",
                        color: {
                            dark: "#172033",
                            light: "#ffffff",
                        },
                    },
                );

                if (!cancelled) {
                    setQrCodeUrl(dataUrl);
                }
            } catch (error) {
                console.error(
                    "Could not generate event registration QR code",
                    error,
                );
            }
        }

        void createQrCode();

        return () => {
            cancelled = true;
        };
    }, [registrationPath]);

    async function copyRegistrationLink() {
        if (!registrationUrl) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                registrationUrl,
            );
            
            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (error) {
            console.error(
                "Could not copy registration link",
                error,
            );
        }
    }

    function downloadQrCode() {
        if (!qrCodeUrl) {
            return;
        }

        const safeEventName = eventName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        
        const downloadLink =
            document.createElement("a");
        
        downloadLink.href = qrCodeUrl;
        downloadLink.download = `${
            safeEventName || "lia-event"
        }-registration-qr.png`;

        downloadLink.click();
    }

    return (
        <div>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-semibold text-white">
                        Student registration
                    </p>

                    <p className="mt-1 text-sm text-white/60">
                        {registrationCount.toLocaleString(
                            "en-US",
                        )}{" "}
                        {registrationCount === 1
                            ? "student registered"
                            : "students registered"}
                    </p>
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        registrationOpen
                            ? "bg-green-400/15 text-green-300"
                            : "bg-amber-400/15 text-amber-200"
                    }`}
                >

                    {registrationOpen
                        ? "Open"
                        : "Closed"
                    }
                </span>
            </div>

            <div className="mt-5 flex justify-center rounded-xl bg-white p-3">
                {qrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={qrCodeUrl}
                        alt={`Registration QR code for ${eventName}`}
                        className="h-44 w-44"
                    />
                ) : (
                    <div className="flex h-44 w-44 items-center justify-center text-zinc-500">
                        <QrCode className="h-10 w-10 animate-pulse" />
                    </div>
                )}
            </div>

            <p className="mt-4 break-all text-xs leading-5 text-white/55">
                {registrationUrl}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                    type="button"
                    onClick={copyRegistrationLink}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                    <Copy className="h-4 w-4" />
                    {copied ? "Link Copied": "Copy Link"}
                </button>

                <button
                    type="button"
                    onClick={downloadQrCode}
                    disabled={!qrCodeUrl}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download className="h-4 w-4" />
                    Download QR
                </button>
            </div>

            <a
                href={registrationUrl || registrationPath}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
                    registrationOpen
                        ? "bg-white text-[#172033] hover:bg-zinc-100"
                        : "pointer-events-none bg-white/10 text-white/40"
                }`}
            >
                <ExternalLink className="h-4 w-4" />
                Open Registration Form
            </a>
        </div>
    );
}

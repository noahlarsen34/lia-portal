"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";

type ApplicationQrCodeProps = {
    applicationUrl: string;
}

export function ApplicationQrCode({ applicationUrl }: ApplicationQrCodeProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        toDataURL(applicationUrl, {
            width: 240,
            margin: 2,
            color: {
                dark: "#111111",
                light: "#ffffff",
            },
        }).then(setQrCodeUrl);
    }, [applicationUrl]);

    async function copyLink() {
    await navigator.clipboard.writeText(applicationUrl);
    setCopied(true);

    window.setTimeout(() => {
        setCopied(false);
    }, 2000);
}
    function downloadQrCode() {
        if(!qrCodeUrl) {
            return;
        }

        const link = document.createElement("a");
        link.href = qrCodeUrl;
        link.download = "lia-application-qr-code.png";
        link.click();
    }

    return (
        <div className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                QR Code
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-44 w-44 items-center justify-center rounded-md border border-zinc-200 bg-white p-3">
                    {qrCodeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={qrCodeUrl}
                            alt="Student application QR code"
                            className="h-full w-full"
                        />
                    ) : (
                        <span className="text-sm text-zinc-500">Loading...</span>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-zinc-950 [overflow-wrap:anywhere]">
                        {applicationUrl}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                        Students can scan this code to open the application form.
                    </p>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={copyLink}
                            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c4122f]"
                        >
                            {copied ? "Copied" : "Copy Link"}
                        </button>

                        <button
                            type="button"
                            onClick={downloadQrCode}
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Download QR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}



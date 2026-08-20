"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toDataURL } from "qrcode";

type TicketQrProps = {
    ticketPath: string;
    ticketNumber: string;
};

export function TicketQr({
    ticketPath,
    ticketNumber,
}: TicketQrProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function generateQrCode() {
            const ticketUrl = new URL(
                ticketPath,
                window.location.origin,
            ).toString();

            const dataUrl = await toDataURL(ticketUrl, {
                width: 600,
                margin: 2,
                errorCorrectionLevel: "H",
                color: {
                    dark: "#172033",
                    light: "#ffffff",
                },
            });

            if (!cancelled) {
                setQrCodeUrl(dataUrl);
            }
        }

        void generateQrCode();

        return () => {
            cancelled = true;
        };
    }, [ticketPath]);

    function downloadTicketQr() {
        if (!qrCodeUrl) {
            return;
        }

        const link = document.createElement("a");
        link.href = qrCodeUrl;
        link.download = `${ticketNumber}-ticket-qr.png`;
        link.click();
    }

    if (!qrCodeUrl) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-2xp bg-white text-sm text-zinc-500">
                Creating ticket QR code...
            </div>
        );
    }

    return (
        <div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={qrCodeUrl}
                    alt={`Check-in QR code for ticket ${ticketNumber}`}
                    className="mx-auto aspect-square w-full max-w-72"
                />
            </div>

            <button
                type="button"
                onClick={downloadTicketQr}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
            >
                <Download size={18} />
                Downloard QR Code
            </button>
        </div>
    );
}
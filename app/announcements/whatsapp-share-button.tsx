"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

type WhatsAppShareButtonProps = {
    title: string;
    body: string;
    communityName: string;
    communityUrl: string;
};

export function WhatsAppShareButton({
    title,
    body,
    communityName,
    communityUrl,
}: WhatsAppShareButtonProps) {
    const [copyStatus, setCopyStatus] = useState<
        "idle" | "copied" | "manual"
    >("idle");
    const communityOwner = communityName.replace(
        /'s WhatsApp Community$/,
        "",
    );

    function copyAnnouncement(message: string) {
        const textarea = document.createElement("textarea");

        textarea.value = message;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        const copied = document.execCommand("copy");
        textarea.remove();

        return copied;
    }

    function handleShare() {
        const message = `${title}\n\n${body}\n\nPosted in the LIA Portal`;
        const copied = copyAnnouncement(message);

        setCopyStatus(copied ? "copied" : "manual");
        window.open(communityUrl, "_blank", "noopener,noreferrer");

        window.setTimeout(() => {
            setCopyStatus("idle");
        }, 4000);
    }

  return (
    <button
        type="button"
        onClick={handleShare}
        className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-green-600 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50"
        aria-label={`Share to ${communityName}`}
    >
        {copyStatus === "copied" ? (
            <Copy size={15} />
        ) : (
            <ExternalLink size={15} />
        )}
        {copyStatus === "copied"
            ? "Copied - paste in WhatsApp"
            : copyStatus === "manual"
              ? "WhatsApp opened - copy manually"
              : `Share to ${communityOwner}`}
    </button>
  );
}

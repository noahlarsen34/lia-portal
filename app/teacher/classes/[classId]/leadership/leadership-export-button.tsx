"use client";

import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { exportLeadershipToGoogleSheet } from "./export-actions";

type LeadershipExportButtonProps = {
    classId: string;
    roleFilter: string;
    committeeFilter: string;
    tierFilter: string;
    disabled?: boolean;
};

export function LeadershipExportButton({
    classId,
    roleFilter,
    committeeFilter,
    tierFilter,
    disabled = false,
}: LeadershipExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState("");
    const [exportError, setExportError] = useState("");

    async function handleExport() {
        setIsExporting(true);
        setExportUrl("");
        setExportError("");

        try {
            const result = await exportLeadershipToGoogleSheet(classId, {
                role: roleFilter,
                committee: committeeFilter,
                tier: tierFilter,
            });

            setExportUrl(result.url);
            window.open(
                result.url,
                "_blank",
                "noopener,noreferrer",
            );
        } catch (error) {
            setExportError(
                error instanceof Error
                    ? error.message
                    : "The leadership directory could not be exported.",
            );
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <div className="sm:text-right">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={disabled || isExporting}
                    className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-green-600 bg-white px-4 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
                >
                    <Download className="size-4" aria-hidden />
                    {isExporting
                        ? "Exporting..."
                        : "Export to Google Sheet"}
                </button>

                {exportUrl ? (
                    <a
                        href={exportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-green-700 px-4 text-sm font-semibold text-white transition hover:bg-green-800"
                    >
                        Open exported sheet
                        <ExternalLink className="size-4" aria-hidden />
                    </a>
                ) : null}
            </div>

            {exportError ? (
                <p className="mt-2 text-sm text-red-700">
                    {exportError}
                </p>
            ) : null}
        </div>
    );
}

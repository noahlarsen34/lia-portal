"use client";

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

export function MouDocumentPreview({ documentUrl }: { documentUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const previewContainer = containerRef.current;
    if (!previewContainer) return;
    let cancelled = false;

    async function renderDocument() {
      try {
        const response = await fetch(documentUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("The document could not be loaded.");
        const blob = await response.blob();
        if (cancelled) return;
        previewContainer!.replaceChildren();
        await renderAsync(blob, previewContainer!, undefined, {
          className: "mou-word-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
        });
        if (!cancelled) setLoading(false);
      } catch (renderError) {
        if (!cancelled) {
          setLoading(false);
          setError(
            renderError instanceof Error
              ? renderError.message
              : "The document could not be rendered.",
          );
        }
      }
    }

    void renderDocument();
    return () => {
      cancelled = true;
    };
  }, [documentUrl]);

  if (error) {
    return <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  }

  return (
    <div>
      <div className="preview-controls mb-3 flex justify-end">
        <button type="button" onClick={() => window.print()} disabled={loading} className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50">Print / Save as PDF</button>
      </div>
      {loading ? <p role="status" className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Loading the complete MOU preview…</p> : null}
      <div className="mou-preview-shell overflow-auto rounded-lg border border-zinc-200 bg-zinc-200 p-3 shadow-inner sm:p-6">
        <div ref={containerRef} className="min-h-96 [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0 [&_section.docx]:!mx-auto [&_section.docx]:!mb-6 [&_section.docx]:!shadow-lg" />
      </div>
    </div>
  );
}

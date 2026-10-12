import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { approveMouForSending } from "../actions";
import { MouDocumentPreview } from "./mou-document-preview";

export default async function MouPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: draft } = await supabase
    .from("school_mou_drafts")
    .select("school_name, status, document_storage_path, generated_at")
    .eq("interest_submission_id", id)
    .eq("is_current", true)
    .maybeSingle();

  if (!draft) notFound();
  if (!draft.document_storage_path || !draft.generated_at) {
    redirect(`/onboarding/${id}/mou?error=document-required`);
  }

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />
      <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="preview-controls">
          <Link href={`/onboarding/${id}/mou`} className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]">Back to MOU pricing</Link>
          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">Full document review</p>
              <h1 className="mt-2 text-3xl font-semibold">Review MOU · {draft.school_name}</h1>
              <p className="mt-2 text-sm text-zinc-600">Review every page before locking this document for sending.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/onboarding/${id}/mou/document`} download className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold hover:bg-zinc-50">Download Word document</a>
              {draft.status === "draft" ? (
                <form action={approveMouForSending.bind(null, id)}>
                  <button type="submit" className="h-11 rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]">Approve MOU for sending</button>
                </form>
              ) : (
                <span className="inline-flex h-11 items-center rounded-md bg-green-100 px-4 text-sm font-semibold text-green-800">Ready to send</span>
              )}
            </div>
          </div>
          <div className="my-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Approval locks the pricing and generated document. No email is sent during this step.</div>
          </div>
          <MouDocumentPreview documentUrl={`/onboarding/${id}/mou/document`} />
          <style>{`@media print {
            header, aside, .preview-controls { display: none !important; }
            body, main, main > section { background: white !important; margin: 0 !important; padding: 0 !important; }
            .mou-preview-shell { border: 0 !important; box-shadow: none !important; overflow: visible !important; padding: 0 !important; }
            .docx-wrapper { background: white !important; padding: 0 !important; }
            section.docx { box-shadow: none !important; margin: 0 auto !important; }
          }`}</style>
        </div>
      </section>
    </main>
  );
}

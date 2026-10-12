import { requireStaff } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: draft } = await supabase
    .from("school_mou_drafts")
    .select("school_name, document_storage_bucket, document_storage_path")
    .eq("interest_submission_id", id)
    .eq("is_current", true)
    .maybeSingle();

  if (!draft?.document_storage_bucket || !draft.document_storage_path) {
    return new Response("MOU document not found.", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: document, error } = await admin.storage
    .from(draft.document_storage_bucket)
    .download(draft.document_storage_path);

  if (error || !document) {
    console.error("Could not load MOU document for preview", {
      submissionId: id,
      message: error?.message ?? "Document download returned no data.",
    });
    return new Response("MOU document could not be loaded.", { status: 502 });
  }

  const safeName = draft.school_name
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return new Response(await document.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `inline; filename="${safeName || "school"}-mou.docx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  });
}

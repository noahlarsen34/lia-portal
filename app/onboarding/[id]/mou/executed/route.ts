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
    .select("school_name, revision, executed_document_storage_bucket, executed_document_storage_path")
    .eq("interest_submission_id", id)
    .eq("is_current", true)
    .maybeSingle();

  if (!draft?.executed_document_storage_bucket || !draft.executed_document_storage_path) {
    return new Response("Executed MOU not found.", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: document, error } = await admin.storage
    .from(draft.executed_document_storage_bucket)
    .download(draft.executed_document_storage_path);

  if (error || !document) {
    return new Response("Executed MOU could not be loaded.", { status: 502 });
  }

  const safeName = draft.school_name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "school";
  return new Response(await document.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${safeName}-executed-mou-revision-${draft.revision}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyDocusignHmac } from "@/utils/docusign";
import { completeMouFromDocusign } from "@/utils/mou-signature";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type DocusignEvent = {
  event?: string;
  generatedDateTime?: string;
  data?: {
    envelopeId?: string;
    envelopeSummary?: {
      envelopeId?: string;
      status?: string;
      statusChangedDateTime?: string;
      completedDateTime?: string;
      declinedDateTime?: string;
      voidedDateTime?: string;
      voidedReason?: string;
    };
  };
};

function normalizeStatus(event: DocusignEvent) {
  const eventName = event.event?.toLowerCase() || "";
  return (
    event.data?.envelopeSummary?.status?.toLowerCase() ||
    eventName.replace(/^envelope-/, "").replace(/^recipient-/, "") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-docusign-signature-1");

  if (!verifyDocusignHmac(payload, signature)) {
    console.warn("Rejected invalid DocuSign webhook signature");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: DocusignEvent;
  try {
    event = JSON.parse(payload) as DocusignEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const envelopeId = event.data?.envelopeId || event.data?.envelopeSummary?.envelopeId;
  if (!envelopeId) {
    return NextResponse.json({ error: "Envelope ID is missing." }, { status: 400 });
  }

  const eventType = event.event || "unknown";
  const eventAt =
    event.data?.envelopeSummary?.statusChangedDateTime ||
    event.generatedDateTime ||
    new Date().toISOString();
  const payloadSha256 = createHash("sha256").update(payload).digest("hex");
  const admin = createAdminClient();

  const { data: existingEvent } = await admin
    .from("mou_docusign_events")
    .select("id, processed_at")
    .eq("payload_sha256", payloadSha256)
    .maybeSingle();

  if (existingEvent?.processed_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const eventRecord = existingEvent
    ? { data: existingEvent, error: null }
    : await admin
        .from("mou_docusign_events")
        .insert({
          docusign_envelope_id: envelopeId,
          event_type: eventType,
          event_at: eventAt,
          payload_sha256: payloadSha256,
          payload: event,
        })
        .select("id")
        .single();

  if (eventRecord.error || !eventRecord.data) {
    console.error("Could not store DocuSign webhook", {
      envelopeId,
      message: eventRecord.error?.message,
    });
    return NextResponse.json({ error: "Could not store webhook." }, { status: 500 });
  }

  const status = normalizeStatus(event);
  try {
    const { data: draft, error: draftError } = await admin
      .from("school_mou_drafts")
      .update({
        docusign_status: status,
        docusign_status_updated_at: eventAt,
        void_reason: event.data?.envelopeSummary?.voidedReason || null,
      })
      .eq("docusign_envelope_id", envelopeId)
      .select("id")
      .maybeSingle();

    if (draftError || !draft) {
      throw new Error(draftError?.message || "No MOU draft matches this envelope.");
    }

    if (status === "completed" || eventType.toLowerCase() === "envelope-completed") {
      await completeMouFromDocusign(
        envelopeId,
        event.data?.envelopeSummary?.completedDateTime || eventAt,
      );
    }

    await admin
      .from("mou_docusign_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null })
      .eq("id", eventRecord.data.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DocuSign processing error";
    await admin
      .from("mou_docusign_events")
      .update({ processing_error: message })
      .eq("id", eventRecord.data.id);
    console.error("Could not process DocuSign webhook", { envelopeId, eventType, message });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

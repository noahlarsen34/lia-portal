import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const trackedEvents = new Set([
    "email.sent",
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.failed",
    "email.suppressed",
    "email.complained",
]);

function getDeliveryStatus(eventType: string) {
    switch (eventType) {
        case "email.sent":
            return "sent";
        case "email.delivered":
            return "delivered";
        case "email.delivery_delayed":
            return "delayed";
        case "email.bounced":
            return "bounced";
        case "email.failed":
            return "failed";
        case "email.suppressed":
            return "suppressed";
        case "email.complained":
            return "complained";
        default:
            return null;
    }
}

function getEmailKind(subject: string) {
    const normalizedSubject = subject.toLowerCase();

    if (normalizedSubject.includes("login code")) {
        return "login_code";
    }

    if (normalizedSubject.includes("activate")) {
        return "invitation";
    }

    if (normalizedSubject.includes("access link")) {
        return "access_link";
    }

    return "other";
}

export async function POST(request: Request) {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!webhookSecret || !resendApiKey) {
        console.error("Resend webhook environment variables are missing.");
        return NextResponse.json(
            { error: "Webhook is not configured." },
            { status: 500 },
        );
    }

    const payload = await request.text();
    const resend = new Resend(resendApiKey);

    let event;

    try {
        event = resend.webhooks.verify({
            payload,
            headers: {
                id: request.headers.get("svix-id") ?? "",
                timestamp: request.headers.get("svix-timestamp") ?? "",
                signature: request.headers.get("svix-signature") ?? "",
            },
            webhookSecret,
        });
    } catch (error) {
        console.warn("Rejected invalid Resend webhook", {
            message: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json(
            { error: "Invalid webhook signature." },
            { status: 400 },
        );
    }

    if (!trackedEvents.has(event.type) || !("email_id" in event.data)) {
        return NextResponse.json({ received: true });
    }

    const status = getDeliveryStatus(event.type);

    if (!status) {
        return NextResponse.json({ received: true });
    }

    const recipient = event.data.to[0]?.trim().toLowerCase();

    if (!recipient) {
        return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();
    const eventAt = event.created_at || event.data.created_at;

    const { data: teacher } = await admin
        .from("teachers")
        .select("id")
        .ilike("email", recipient)
        .limit(1)
        .maybeSingle();

    const { data: existingByEmailId } = await admin
        .from("email_deliveries")
        .select("id, event_at")
        .eq("resend_email_id", event.data.email_id)
        .maybeSingle();

    let deliveryId = existingByEmailId?.id ?? null;

    if (!deliveryId) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: requestedDelivery } = await admin
            .from("email_deliveries")
            .select("id")
            .ilike("recipient", recipient)
            .eq("subject", event.data.subject)
            .eq("status", "requested")
            .gte("requested_at", fiveMinutesAgo)
            .order("requested_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        deliveryId = requestedDelivery?.id ?? null;
    }

    if (
        existingByEmailId?.event_at &&
        new Date(existingByEmailId.event_at).getTime() > new Date(eventAt).getTime()
    ) {
        return NextResponse.json({ received: true });
    }

    const bounce = event.type === "email.bounced" ? event.data.bounce : null;
    const failed = event.type === "email.failed" ? event.data.failed : null;
    const suppressed =
        event.type === "email.suppressed" ? event.data.suppressed : null;

    const delivery = {
        resend_email_id: event.data.email_id,
        teacher_id: teacher?.id ?? null,
        recipient,
        subject: event.data.subject,
        email_kind: getEmailKind(event.data.subject),
        status,
        status_message:
            bounce?.message ?? failed?.reason ?? suppressed?.message ?? null,
        bounce_type: bounce?.type ?? null,
        bounce_subtype: bounce?.subType ?? null,
        event_data: event,
        event_at: eventAt,
        updated_at: new Date().toISOString(),
    };

    const result = deliveryId
        ? await admin.from("email_deliveries").update(delivery).eq("id", deliveryId)
        : await admin.from("email_deliveries").insert(delivery);

    if (result.error) {
        console.error("Could not store Resend delivery event", {
            emailId: event.data.email_id,
            eventType: event.type,
            message: result.error.message,
        });

        return NextResponse.json(
            { error: "Could not store delivery event." },
            { status: 500 },
        );
    }

    return NextResponse.json({ received: true });
}

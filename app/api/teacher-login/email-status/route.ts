import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pendingEmailCookie = "lia_pending_teacher_email";

type PublicDeliveryStatus =
    | "pending"
    | "sent"
    | "delivered"
    | "delayed"
    | "rejected";

function getPublicStatus(status: string): PublicDeliveryStatus {
    switch (status) {
        case "delivered":
            return "delivered";
        case "delayed":
            return "delayed";
        case "bounced":
        case "failed":
        case "suppressed":
        case "complained":
            return "rejected";
        case "sent":
            return "sent";
        case "requested":
        default:
            return "pending";
    }
}

export async function GET() {
    const cookieStore = await cookies();
    const email = cookieStore
        .get(pendingEmailCookie)
        ?.value.trim()
        .toLowerCase();

    if (!email) {
        return NextResponse.json(
            { status: "missing-request" },
            {
                status: 401,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }

    const admin = createAdminClient();
    const requestWindowStart = new Date(
        Date.now() - 15 * 60 * 1000,
    ).toISOString();

    const { data: delivery, error } = await admin
        .from("email_deliveries")
        .select("status, updated_at")
        .ilike("recipient", email)
        .eq("email_kind", "login_code")
        .gte("requested_at", requestWindowStart)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Could not check teacher login email status", {
            message: error.message,
        });

        return NextResponse.json(
            { status: "pending" satisfies PublicDeliveryStatus },
            { headers: { "Cache-Control": "no-store" } },
        );
    }

    return NextResponse.json(
        {
            status: delivery
                ? getPublicStatus(delivery.status)
                : ("pending" satisfies PublicDeliveryStatus),
            updatedAt: delivery?.updated_at ?? null,
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}


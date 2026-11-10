import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireAdmin } from "@/utils/role-guards";
import {
    sendDistrictLiaisonInvitation,
    setDistrictLiaisonStatus,
    updateDistrictLiaison,
} from "../actions";

const errorMessages: Record<string, string> = {
    "missing-fields": "Enter a first name, last name, valid email, and select at least one district.",
    "invalid-district": "One or more selected districts are no longer available.",
    "email-exists": "Another district liaison already uses this email address.",
    "update-failed": "The liaison details could not be updated.",
    "assignment-failed": "The district assignments could not be updated.",
    "status-failed": "The account status could not be updated.",
    "access-disabled": "Reactivate this liaison before sending an invitation.",
    "configuration-error": "The application URL is not configured for invitation links.",
    "invite-failed": "The invitation email could not be sent.",
    "account-mismatch": "The liaison email is linked to a different activated account. Contact support before changing it.",
};

const noticeMessages: Record<string, string> = {
    created: "District liaison created. You can now send the activation invitation.",
    updated: "Liaison details and district assignments were updated.",
    active: "The liaison account was reactivated.",
    inactive: "The liaison account was disabled and can no longer sign in.",
    "invite-sent": "The activation invitation was sent.",
    "access-sent": "A new secure portal access link was sent.",
};

export default async function LiaisonDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ liaisonId: string }>;
    searchParams: Promise<{ error?: string; notice?: string }>;
}) {
    const [{ liaisonId }, query] = await Promise.all([params, searchParams]);
    const { supabase } = await requireAdmin();
    const [liaisonResult, districtsResult, assignmentsResult, deliveryResult] =
        await Promise.all([
            supabase
                .from("district_liaisons")
                .select(
                    "id, first_name, last_name, email, status, portal_access_status, invited_at, activated_at, last_portal_login_at",
                )
                .eq("id", liaisonId)
                .maybeSingle(),
            supabase
                .from("districts")
                .select("id, name, state")
                .order("state", { ascending: true })
                .order("name", { ascending: true }),
            supabase
                .from("district_liaison_districts")
                .select("district_id")
                .eq("liaison_id", liaisonId),
            supabase
                .from("email_deliveries")
                .select("status, requested_at, subject")
                .eq("district_liaison_id", liaisonId)
                .in("email_kind", ["invitation", "access_link"])
                .order("requested_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

    const liaison = liaisonResult.data;
    if (!liaison) notFound();

    const selectedDistrictIds = new Set(
        (assignmentsResult.data ?? []).map((assignment) => assignment.district_id),
    );
    const updateAction = updateDistrictLiaison.bind(null, liaison.id);
    const inviteAction = sendDistrictLiaisonInvitation.bind(null, liaison.id);
    const deactivateAction = setDistrictLiaisonStatus.bind(
        null,
        liaison.id,
        "inactive",
    );
    const activateAction = setDistrictLiaisonStatus.bind(
        null,
        liaison.id,
        "active",
    );
    const formatDate = (value: string | null) =>
        value
            ? new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Denver",
            }).format(new Date(value))
            : "Not yet";

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />
            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <Link href="/liaisons" className="text-sm font-semibold text-[#c8102e]">
                        ← Back to District Liaisons
                    </Link>

                    <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">District Liaison</p>
                            <h1 className="mt-2 text-3xl font-semibold">
                                {`${liaison.first_name ?? ""} ${liaison.last_name ?? ""}`.trim() || "Unnamed liaison"}
                            </h1>
                            <p className="mt-1 text-sm text-zinc-600">{liaison.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className={liaison.status === "active" ? "rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700" : "rounded-full bg-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"}>
                                {liaison.status === "active" ? "Active" : "Inactive"}
                            </span>
                            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold capitalize text-blue-700">
                                {liaison.portal_access_status.replaceAll("_", " ")}
                            </span>
                        </div>
                    </header>

                    {query.error ? (
                        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessages[query.error] ?? "The requested change could not be completed."}
                        </div>
                    ) : null}
                    {query.notice ? (
                        <div className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            {noticeMessages[query.notice] ?? "The liaison was updated."}
                        </div>
                    ) : null}

                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm sm:p-7">
                            <h2 className="text-xl font-semibold">Liaison details</h2>
                            <form action={updateAction} className="mt-5 space-y-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-medium text-zinc-800">First name</span>
                                        <input name="first_name" required defaultValue={liaison.first_name ?? ""} className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100" />
                                    </label>
                                    <label className="block">
                                        <span className="text-sm font-medium text-zinc-800">Last name</span>
                                        <input name="last_name" required defaultValue={liaison.last_name ?? ""} className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100" />
                                    </label>
                                </div>
                                <label className="block">
                                    <span className="text-sm font-medium text-zinc-800">Email address</span>
                                    <input name="email" type="email" required defaultValue={liaison.email} className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100" />
                                </label>
                                <fieldset>
                                    <legend className="text-sm font-semibold text-zinc-900">Assigned districts</legend>
                                    <p className="mt-1 text-xs text-zinc-500">Changes take effect immediately when saved.</p>
                                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-3">
                                        {(districtsResult.data ?? []).map((district) => (
                                            <label key={district.id} className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 hover:bg-red-50">
                                                <input type="checkbox" name="district_ids" value={district.id} defaultChecked={selectedDistrictIds.has(district.id)} className="mt-0.5 h-4 w-4 accent-[#c8102e]" />
                                                <span className="text-sm"><span className="font-medium">{district.name}</span>{district.state ? <span className="text-zinc-500"> · {district.state}</span> : null}</span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                                <div className="flex justify-end border-t border-zinc-100 pt-5">
                                    <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]">Save Changes</button>
                                </div>
                            </form>
                        </section>

                        <aside className="space-y-5">
                            <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
                                <h2 className="font-semibold">Portal access</h2>
                                <dl className="mt-4 space-y-3 text-sm">
                                    <div><dt className="text-zinc-500">Invited</dt><dd className="font-medium">{formatDate(liaison.invited_at)}</dd></div>
                                    <div><dt className="text-zinc-500">Activated</dt><dd className="font-medium">{formatDate(liaison.activated_at)}</dd></div>
                                    <div><dt className="text-zinc-500">Last login</dt><dd className="font-medium">{formatDate(liaison.last_portal_login_at)}</dd></div>
                                    <div><dt className="text-zinc-500">Latest email</dt><dd className="font-medium capitalize">{deliveryResult.data ? `${deliveryResult.data.status} · ${formatDate(deliveryResult.data.requested_at)}` : "None sent"}</dd></div>
                                </dl>
                                {liaison.status === "active" ? (
                                    <form action={inviteAction} className="mt-5">
                                        <button type="submit" className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#c8102e] px-3 text-sm font-semibold text-[#c8102e] hover:bg-red-50">
                                            {liaison.activated_at ? "Send New Access Link" : liaison.invited_at ? "Resend Invitation" : "Send Invitation"}
                                        </button>
                                    </form>
                                ) : null}
                            </section>

                            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                                <h2 className="font-semibold">Account status</h2>
                                <p className="mt-2 text-sm leading-6 text-zinc-600">
                                    {liaison.status === "active" ? "Disabling immediately prevents portal sign-in." : "Reactivating restores the account. An invitation may still be required."}
                                </p>
                                <form action={liaison.status === "active" ? deactivateAction : activateAction} className="mt-4">
                                    <button type="submit" className={liaison.status === "active" ? "inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" : "inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-3 text-sm font-semibold text-white hover:bg-[#a70d25]"}>
                                        {liaison.status === "active" ? "Disable Account" : "Reactivate Account"}
                                    </button>
                                </form>
                            </section>
                        </aside>
                    </div>
                </div>
            </section>
        </main>
    );
}

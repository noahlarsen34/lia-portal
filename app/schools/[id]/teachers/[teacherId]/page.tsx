import Link from 'next/link';
import { notFound } from "next/navigation";
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { requireStaff } from '@/utils/role-guards';
import { inviteTeacher } from './invite-actions';

type TeacherPageProps = {
    params: Promise<{
        id: string;
        teacherId: string;
    }>;
    searchParams: Promise<{
        invite?: string;
    }>;
};

function formatDeliveryStatus(status: string) {
    switch (status) {
        case "requested":
            return "Requested";
        case "sent":
            return "Sent to provider";
        case "delivered":
            return "Delivered";
        case "delayed":
            return "Delayed";
        case "bounced":
            return "Bounced";
        case "failed":
            return "Failed";
        case "suppressed":
            return "Suppressed";
        case "complained":
            return "Marked as spam";
        default:
            return status;
    }
}

function getDeliveryStatusClassName(status: string) {
    switch (status) {
        case "delivered":
            return "bg-green-50 text-green-700";
        case "requested":
        case "sent":
            return "bg-blue-50 text-blue-700";
        case "delayed":
            return "bg-amber-50 text-amber-700";
        case "bounced":
        case "failed":
        case "suppressed":
        case "complained":
            return "bg-red-50 text-red-700";
        default:
            return "bg-zinc-100 text-zinc-700";
    }
}

function formatDeliveryDate(value: string | null) {
    if (!value) {
        return "Unknown time";
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Denver",
    }).format(new Date(value));
}

export default async function TeacherPage({ params, searchParams, }: TeacherPageProps) {
    const { id, teacherId } = await params;
    const { invite } = await searchParams;
    const { supabase } = await requireStaff();

    const { data: school } = await supabase
        .from("schools")
        .select("id, name")
        .eq("id", id)
        .single();

    const { data: teacher } = await supabase
        .from("teachers")
        .select(
            "id, first_name, last_name, name, email, phone, status, username, program_level, notes, password_status, is_new_teacher, profile_id, portal_access_status, invited_at, activated_at, last_portal_login_at"
        )
        .eq("id", teacherId)
        .eq("school_id", id)
        .single();
    
    if (!school || !teacher) {
        notFound();
    }

    const { data: emailDeliveries, error: emailDeliveriesError } =
        await supabase
            .from("email_deliveries")
            .select(
                "id, subject, email_kind, status, status_message, bounce_type, bounce_subtype, requested_at, event_at, reference_code",
            )
            .eq("teacher_id", teacher.id)
            .order("requested_at", { ascending: false })
            .limit(10);

    if (emailDeliveriesError) {
        console.error("Could not load teacher email delivery history", {
            teacherId: teacher.id,
            message: emailDeliveriesError.message,
        });
    }

    const displayName = 
        `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
        teacher.name
    
    const inviteTeacherAccount = inviteTeacher.bind(
        null,
        school.id,
        teacher.id,
    )

    const portalAccessStatus = teacher.portal_access_status ?? "not_invited";
    const isPortalAccountActive =
        portalAccessStatus === "active" ||
        teacher.password_status === "active" ||
        Boolean(teacher.activated_at);
    const isPendingInvitation =
        !isPortalAccountActive &&
        (portalAccessStatus === "invited" || Boolean(teacher.profile_id));

    const formatProgramLevel = (programLevel: string | null) => {
        switch (programLevel) {
            case "elementary":
                return "Elementary";
            case "middle":
                return "Middle School";
            case "high":
                return "High School";
            case "middle_high":
                return "Middle + High School";
            case "k_8":
                return "K-8";
            case "k_12":
                return "K-12";
            case "other":
                return "Other";
            case "unknown":
            default:
                return "Unknown";
        }
    };
    
    return (
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8'>
                <div className='mx-auto w-full max-w-3xl'>
                    <Link
                        href={`/schools/${school.id}`}
                        className='text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]'
                    >
                        Back to {school.name}
                    </Link>

                    {invite === "sent" || invite === "resent" || invite === "access-sent" ? (
                        <div className='mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
                            {invite === "access-sent"
                                ? `A new portal access email was submitted for ${teacher.email}. Check Email Delivery below for its final status.`
                                : invite === "resent"
                                ? `A new invitation was submitted for ${teacher.email}. The old link can be ignored. Check Email Delivery below for its final status.`
                                : `An invitation was submitted for ${teacher.email}. Check Email Delivery below for its final status.`}
                        </div>
                    ) : null}

                    {invite && invite !== "sent" && invite !== "resent" && invite !== "access-sent" ? (
                        <div className='mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                            {invite === "email-required"
                                ? 'Add an email address before inviting this teacher.'
                                : invite === "teacher-inactive"
                                    ? "Only active teachers can be invited."
                                    : invite === "already-linked"
                                        ? "This teacher is already linked to a portal account."
                                        : invite === "access-disabled"
                                            ? "Portal access is disabled for this teacher."
                                        : invite === "configuration-error"
                                            ? "The portal application URL is not configured."
                                            : invite === "teacher-not-found"
                                                ? "That teacher record could not be found."
                                                : "The invitation could not be sent. Please try again."}
                        </div>
                    ) : null}

                    <section className='mt-6 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6'>
                        <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                            Teacher Profile
                        </p>

                        <div className='mt-3 flex flex-wrap items-center gap-3'>
                            <h1 className='break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl'>{displayName}</h1>
                            <span className='rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700'>
                                {teacher.status}
                            </span>
                            
                            {teacher.is_new_teacher ? (
                                <span className='rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#c8102e]'>
                                    New Teacher
                                </span>
                            ) : null}
                        </div>

                        <div className='mt-8 grid gap-6 border-t border-zinc-100 pt-6 md:grid-cols-2'>
                            <div>
                                <p className='text-sm uppercase text-zinc-500'>First Name</p>
                                <p className='mt-1 break-words font-semibold [overflow-wrap:anywhere]'>
                                    {teacher.first_name || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Last Name</p>
                                <p className='mt-1 break-words font-semibold [overflow-wrap:anywhere]'>
                                    {teacher.last_name || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Email</p>
                                <p className='mt-1 break-words font-semibold [overflow-wrap:anywhere]'>
                                    {teacher.email || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Phone</p>
                                <p className='mt-1 break-words font-semibold [overflow-wrap:anywhere]'>
                                    {teacher.phone || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Username</p>
                                <p className='mt-1 break-words font-semibold [overflow-wrap:anywhere]'>
                                    {teacher.username || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>
                                    Program Level
                                </p>
                                <p className='mt-1 font-semibold'>
                                    {formatProgramLevel(teacher.program_level)}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>
                                    Portal Access
                                </p>
                                <p className='mt-1 font-semibold capitalize'>
                                    {portalAccessStatus.replaceAll("_", " ")}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>Status</p>
                                <p className='mt-1 font-semibold capitalize'>
                                    {teacher.status}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm uppercase text-zinc-500">
                                    Last Successful Login
                                </p>
                                <p className="mt-1 font-semibold">
                                    {teacher.last_portal_login_at
                                        ? formatDeliveryDate(
                                              teacher.last_portal_login_at,
                                          )
                                        : "Not yet"}
                                </p>
                            </div>

                            <div>
                                <p className='text-sm uppercase text-zinc-500'>
                                    First Year With LIA
                                </p>
                                <p className='mt-1 font-semibold'>
                                    {teacher.is_new_teacher ? "Yes": "No"}
                                </p>
                            </div>
                        </div>

                        <div className='mt-8 border-t border-zinc-100 pt-6'>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm uppercase text-zinc-500">
                                        Email Delivery
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        Latest invitation, access-link, and login-code activity.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {(emailDeliveries ?? []).map((delivery) => (
                                    <article
                                        key={delivery.id}
                                        className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="break-words text-sm font-semibold text-zinc-900">
                                                    {delivery.subject}
                                                </p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {formatDeliveryDate(
                                                        delivery.event_at ??
                                                            delivery.requested_at,
                                                    )}
                                                </p>
                                                {delivery.reference_code ? (
                                                    <p className="mt-1 text-xs font-semibold text-zinc-600">
                                                        Reference: {delivery.reference_code}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <span
                                                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getDeliveryStatusClassName(delivery.status)}`}
                                            >
                                                {formatDeliveryStatus(delivery.status)}
                                            </span>
                                        </div>

                                        {delivery.status_message ? (
                                            <div className="mt-3 rounded-md border border-red-100 bg-white px-3 py-2 text-xs leading-5 text-red-700">
                                                <p className="font-semibold">
                                                    {delivery.bounce_type ||
                                                    delivery.bounce_subtype
                                                        ? [
                                                              delivery.bounce_type,
                                                              delivery.bounce_subtype,
                                                          ]
                                                              .filter(Boolean)
                                                              .join(" · ")
                                                        : "Delivery details"}
                                                </p>
                                                <p className="mt-1 break-words [overflow-wrap:anywhere]">
                                                    {delivery.status_message}
                                                </p>
                                            </div>
                                        ) : null}
                                    </article>
                                ))}

                                {(emailDeliveries ?? []).length === 0 ? (
                                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                                        No tracked email activity yet. Activity will appear
                                        after the Resend webhook is configured.
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className='mt-8 border-t border-zinc-100 pt-6'>
                            <p className='text-sm uppercase text-zinc-500'>
                                Teacher Notes
                            </p>
                            <div className='mt-2 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3'>
                                <p className='break-words text-sm leading-6 text-zinc-700 [overflow-wrap:anywhere]'>
                                    {teacher.notes || "No teacher notes yet."}
                                </p>
                            </div>
                        </div>

                        <div className='mt-8 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-end'>
                            <Link
                                href={`/schools/${school.id}`}
                                className='inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 sm:w-auto'
                            >
                                Back
                            </Link>

                            <form action={inviteTeacherAccount}>
                                <button
                                    type='submit'
                                    disabled={
                                        !teacher.email ||
                                        teacher.status !== "active" ||
                                        portalAccessStatus === "disabled"
                                    }
                                    className='inline-flex h-10 w-full items-center justify-center rounded-md border border-[#c8102e] bg-white px-4 text-sm font-semibold text-[#c8102e] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 sm:w-auto'
                                >
                                    {isPortalAccountActive
                                        ? "Send New Access Email"
                                        : isPendingInvitation
                                            ? "Resend Invitation"
                                            : "Invite Teacher"}
                                </button>
                            </form>

                            <Link
                                href={`/schools/${school.id}/teachers/${teacher.id}/edit`}
                                className='inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto'
                            >
                                Edit Teacher
                            </Link>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}

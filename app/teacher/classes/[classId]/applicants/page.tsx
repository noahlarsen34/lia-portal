import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { ApplicationQrCode } from "@/components/application-qr-code";
import {
    acceptApplication,
    archiveApplication,
    updateApplicationStatus,
} from "./actions";

type ApplicantsPageProps = {
    params: Promise<{
        classId: string;
    }>;
    searchParams: Promise<{
        error?: string;
        success?: string;
        status?: string;
    }>;
};

function formatDate(value: string | null | undefined) {
    if (!value) {
        return "N/A";
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
    }).format(new Date(value));
}

function statusClassName(status: string) {
    if (status === "accepted") {
        return "rounded-full bg-green-50 px-2 py-1 text-xs font-semibold capitalize text-green-700";
    }

    if (status === "declined") {
        return "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#c4122f]";
    }

    if (status === "maybe") {
        return "rounded-full bg-yellow-50 px-2 py-1 text-xs font-semibold capitalize text-yellow-700";
    }

    return "rounded-full bg-zinc-50 px-2 py-1 text-xs font-semibold capitalize text-zinc-700";
}

export default async function ApplicantsPage({
    params,
    searchParams,
}: ApplicantsPageProps) {
    const { classId } = await params;
    const { error, success, status } = await searchParams;
    const validStatuses = ["submitted", "maybe", "accepted", "declined"];
    const statusFilter = validStatuses.includes(status ?? "") ? status : "all";
    const headerList = await headers();
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name, application_token, applications_open, teacher_profile_id")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass) {
        notFound();
    }

    let applicationsQuery = supabase
        .from("lia_class_applications")
        .select(`
                id,
                first_name,
                last_name,
                email,
                grade_level,
                advisory_teacher,
                color_team,
                status,
                application_complete,
                recommendation_complete,
                completed_interview,
                interview_again,
                submitted_at 
            `,
        )
        .eq("lia_class_id", liaClass.id)
        .is("archived_at", null)
        .order("submitted_at", { ascending: false });
    
    if (statusFilter !== "all") {
        applicationsQuery = applicationsQuery.eq("status", statusFilter);
    }

    const { data: applications, error: applicationsError } = await applicationsQuery;
    
    const host = headerList.get("host");
    const protocol =
        headerList.get("x-forwarded-proto") ??
        (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
            ? "http"
            : "https");
    const appUrl = host
        ? `${protocol}://${host}`
        : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
    const applicationUrl = `${appUrl.replace(/\/$/, "")}/apply/${liaClass.application_token}`;

    return (
        <div className="mx-auto max-w-7xl">
            <Link
                href={`/teacher/classes/${liaClass.id}`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to class
            </Link>

            <header className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                            Applicants
                        </p>
                        <h1 className="mt-2 break-words text-3xl font-semibold [overflow-wrap:anywhere]">
                            {liaClass.name}
                        </h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            Review student applications and move accepted students into your roster.
                        </p>
                    </div>

                    <Link
                        href={applicationUrl}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                    >
                        Open Application
                    </Link>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Student Application Link
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-zinc-950 [overflow-wrap:anywhere]">
                            {applicationUrl}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                            Share this link with students or use the QR code below.
                        </p>
                    </div>
                </div>

                <div className="mt-4">
                    <ApplicationQrCode applicationUrl={applicationUrl} />
                </div>
            </header>

            {error ? (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error === "not-found"
                        ? "That application could not be found."
                        : error === "create-student-failed"
                            ? "Could not create the student record"
                            : error === "enroll-failed"
                                ? "Could not enroll the student"
                                    : error === "update-failed"
                                        ? "Could not update the application."
                                        : error === "archive-failed"
                                            ? "Could not archive that application."
                                            : "Something went wrong. Please try again."}
                </div>
            ) : null}

            {success === "archived" ? (
                <div className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Application archived.
                </div>
            ) : null}

            {applicationsError ? (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Could not load applications. Please confirm the applicant archive
                    database migration has been run.
                </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
                {[
                    { label: "All", value: "all" },
                    { label: "Submitted", value: "submitted"},
                    { label: "Maybe", value: "maybe" },
                    { label: "Accepted", value: "accepted" },
                    { label: "Declined", value: "declined"},
                ].map((filter) => {
                    const active = statusFilter === filter.value;
                    const href =
                        filter.value === "all"
                            ? `/teacher/classes/${liaClass.id}/applicants`
                            : `/teacher/classes/${liaClass.id}/applicants?status=${filter.value}`;
                    
                    return (
                        <Link
                            key={filter.value}
                            href={href}
                            className={
                                active 
                                    ? "rounded-md bg-[#c4122f] px-3 py-2 text-sm font-semibold text-white"
                                    : "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c4122f]"
                            }
                        >
                            {filter.label}
                        </Link>
                    );
                })}
            </div>

            <section className="mt-5 overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
                    <h2 className="text-xl font-semibold">Application Tracker</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                        Students who submitted the public application form.
                    </p>
                </div>

                {applications && applications.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-[900px] table-fixed divide-y divide-zinc-200 text-sm">
                            <colgroup>
                                <col className="w-[220px]" />
                                <col className="w-[240px]" />
                                <col className="w-[80px]" />
                                <col className="w-[130px]" />
                                <col className="w-[130px]" />
                                <col className="w-[260px]" />
                            </colgroup>
                            <thead className="bg-zinc-50 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3 align-middle">Student</th>
                                    <th className="px-4 py-3 align-middle">Email</th>
                                    <th className="px-4 py-3 text-center align-middle">Grade</th>
                                    <th className="px-4 py-3 text-center align-middle">Status</th>
                                    <th className="px-4 py-3 align-middle">Submitted</th>
                                    <th className="sticky right-0 bg-zinc-50 px-4 py-3 text-right align-middle shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {applications.map((application) => {
                                    const studentName = `${application.first_name} ${application.last_name}`.trim();
                                    const markMaybe = updateApplicationStatus.bind(
                                        null,
                                        liaClass.id,
                                        application.id,
                                        "maybe",
                                    );
                                    const decline = updateApplicationStatus.bind(
                                        null,
                                        liaClass.id,
                                        application.id,
                                        "declined",
                                    );
                                    const accept = acceptApplication.bind(
                                        null,
                                        liaClass.id,
                                        application.id
                                    );
                                    const archive = archiveApplication.bind(
                                        null,
                                        liaClass.id,
                                        application.id,
                                    );

                                    return (
                                        <tr key={application.id} className="align-middle">
                                            <td className="break-words px-4 py-4 leading-5 [overflow-wrap:anywhere]">
                                                <p className="font-semibold text-zinc-950">
                                                    {studentName}
                                                </p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    Color Team: {application.color_team || "N/A"}
                                                </p>
                                            </td>
                                            <td className="break-words px-4 py-4 text-zinc-700 [overflow-wrap:anywhere]">
                                                {application.email || "N/A"}
                                            </td>
                                            <td className="px-4 py-4 text-center text-zinc-700">
                                                {application.grade_level || "N/A"}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={statusClassName(application.status)}>
                                                    {application.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 leading-5 text-zinc-700">
                                                {formatDate(application.submitted_at)}
                                            </td>
                                            <td className="sticky right-0 bg-white px-4 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]">
                                                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                                                    <Link
                                                        href={`/teacher/classes/${liaClass.id}/applicants/${application.id}`}
                                                        className="font-semibold text-[#c4122f] hover:text-[#a70d25]"
                                                    >
                                                        View
                                                    </Link>
                                                    <form action={markMaybe}>
                                                        <button
                                                            type="submit"
                                                            className="font-semibold text-yellow-700 hover:text-yellow-800"
                                                        >
                                                            Maybe
                                                        </button> 
                                                    </form>
                                                    <form action={accept}>
                                                        <button
                                                            type="submit"
                                                            className="font-semibold text-green-700 hover:text-green-800"
                                                        >
                                                            Accept
                                                        </button>
                                                    </form>
                                                    <form action={decline}>
                                                        <button
                                                            type="submit"
                                                            className="font-semibold text-[#c4122f] hover:text-[#a70d25]"
                                                        >
                                                            Decline
                                                        </button>
                                                    </form>
                                                    <form action={archive}>
                                                        <button
                                                            type="submit"
                                                            className="font-semibold text-zinc-500 hover:text-zinc-900"
                                                        >
                                                            Archive
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-5 py-10 text-center text-sm text-zinc-500 sm:px-6">
                        No applications submitted yet.
                    </div>
                )}
            </section>
        </div>
    );
}

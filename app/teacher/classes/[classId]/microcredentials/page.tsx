import Link from "next/link";
import { Check, ExternalLink, X, Download } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import DeleteSubmissionButton from "./delete-submission-button";
import QRCode from "qrcode";
import {
    approveMicrocredential,
    rejectMicrocredential,
    deleteMicrocredentialSubmission,
} from "./actions";

type PageProps = {
    params: Promise<{ classId: string }>;
};

export default async function ClassMicrocredentialsPage({
    params,
}: PageProps) {
    const { classId } = await params;
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name, period, school_year, application_token")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();
    
    if (!liaClass) notFound();

    const { data: submissions } = await supabase
        .from("microcredential_submissions")
        .select(`
                id,
                student_name_snapshot,
                credential_type,
                original_file_name,
                file_path,
                student_note,
                teacher_feedback,
                status,
                submitted_at
            `)
        .eq("lia_class_id", liaClass.id)
        .order("submitted_at", { ascending: false });
    
    const admin = createAdminClient();

    const rows = await Promise.all(
        (submissions ?? []).map(async (submission) => {
            const { data } = await admin.storage
                .from("microcredential-submissions")
                .createSignedUrl(submission.file_path, 60 * 10);
            
            return {
                ...submission,
                signedUrl: data?.signedUrl ?? null,
            };
        }),
    );

    const pendingCount = rows.filter(
        (submission) => submission.status === 'pending',
    ).length;

    const approvedCount = rows.filter(
        (submission) => submission.status === "approved",
    ).length;

    const rejectedCount = rows.filter(
        (submission) => submission.status === "rejected",
    ).length;

    const headersList = await headers();
    const host =
        headersList.get("x-forwarded-host") ??
        headersList.get("host");
    
    const protocol =
        headersList.get("x-forwarded-proto") ??
        (host?.includes("localhost") ? "http" : "https");
    
    const baseUrl = host
        ? `${protocol}://${host}`
        : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    
    const studentFormUrl =
        `${baseUrl}/microcredentials/${liaClass.application_token}`;
    
    const studentFormQrCode = await QRCode.toDataURL(studentFormUrl, {
        width: 280,
        margin: 2,
        color: {
            dark: "#111827",
            light: "#ffffff",
        },
    });

    const qrCodeFileName = `${
        liaClass.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "lia-class"
    }-microcredentials-qr-code.png`;

    return (
        <div className="mx-auto max-w-7xl">
            <Link
                href="/teacher/microcredentials"
                className="text-sm font-semibold text-[#c4122f]"
            >
                Back to Microcredentials
            </Link>

            <header className="mt-5 rounded-md border border-red-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase text-[#c4122f]">
                    Microcredentials
                </p>
                <h1 className="mt-2 text-3xl font-semibold">{liaClass.name}</h1>
                <p className="mt-2 text-sm text-zinc-600">
                    Review documents submitted by students.
                </p>

                <section className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_280px]">
                    <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                            Pending
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-zinc-950">
                            {pendingCount}
                        </p>
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                            Approved
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-zinc-950">
                            {approvedCount}
                        </p>
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                            Rejected
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-zinc-950">
                            {rejectedCount}
                        </p>
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm sm:col-span-3 lg:col-span-1">
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                            Student Form
                        </p>

                        <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
                            <img
                                src={studentFormQrCode}
                                alt={`QR code for ${liaClass.name}`}
                                className="mx-auto size-36"
                            />
                        </div>

                        <a
                            href={studentFormQrCode}
                            download={qrCodeFileName}
                            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c4122f] px-3 text-sm font-semibold text-white transition hover:bg-[#a70d25]"
                        >
                            <Download className="size-4" aria-hidden />
                            Download QR code
                        </a>

                        <a 
                            href={studentFormUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-[#c4122f] transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4122f] focus-visible:ring-offset-2"
                        >
                            <ExternalLink className="size-4" aria-hidden />
                            Open Student Form
                        </a>
                    </div>
                </section>
            </header>

            <section className="mt-5 overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[14%]" />
                            <col className="w-[12%]" />
                            <col className="w-[28%]" />
                            <col className="w-[11%]" />
                            <col className="w-[11%]" />
                            <col className="w-[12%]" />
                            <col className="w-[12%]" />
                        </colgroup>
                        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                            <tr>
                                <th className="px-5 py-4">Student</th>
                                <th className="px-5 py-4">Assignment</th>
                                <th className="px-5 py-4">Document</th>
                                <th className="px-5 py-4 text-center">Submitted</th>
                                <th className="px-5 py-4 text-center">Status</th>
                                <th className="px-5 py-4 text-center">Feedback</th>
                                <th className="px-3 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {rows.map((submission) => {
                                const approveAction = approveMicrocredential.bind(
                                    null,
                                    classId,
                                    submission.id,
                                );
                                const rejectAction = rejectMicrocredential.bind(
                                    null,
                                    classId,
                                    submission.id,
                                );
                                const deleteAction = deleteMicrocredentialSubmission.bind(
                                    null,
                                    classId,
                                    submission.id,
                                );

                                return (
                                <tr key={submission.id} className="align-middle">
                                    <td className="px-5 py-4 font-semibold">
                                        {submission.student_name_snapshot}
                                    </td>
                                    <td className="break-words px-5 py-4">
                                        {submission.credential_type}
                                    </td>
                                    <td className="px-5 py-4">
                                        {submission.signedUrl ? (
                                            <a
                                                href={submission.signedUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={submission.original_file_name}
                                                className="block truncate font-semibold text-[#c4122f] hover:underline"
                                            >
                                                {submission.original_file_name}
                                            </a>
                                        ) : (
                                            <span className="text-zinc-400">Unavailable</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center tabular-nums">
                                        {new Date(submission.submitted_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span
                                            className={
                                                submission.status === "approved"
                                                    ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700"
                                                    : submission.status === "rejected"
                                                        ? "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold capitalize text-red-700"
                                                        : "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-700"
                                            }
                                        >
                                            {submission.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center leading-6 text-zinc-600">
                                        {submission.teacher_feedback || "—"}
                                    </td>
                                    <td className="px-3 py-4">
                                        <div className="flex items-start justify-center gap-1.5">
                                            {submission.status === "pending" ? (
                                                <>
                                                    <form action={approveAction}>
                                                        <button
                                                            type="submit"
                                                            aria-label={`Approve ${submission.student_name_snapshot}'s submission`}
                                                            title="Approve submission"
                                                            className="inline-flex size-9 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                                                        >
                                                            <Check className="size-4" />
                                                        </button>
                                                    </form>

                                                    <details className="group">
                                                        <summary
                                                            title="Reject submission"
                                                            className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-md border border-red-200 bg-red-50 text-[#c4122f] transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4122f] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
                                                        >
                                                            <X className="size-4" />
                                                            <span className="sr-only">
                                                                Reject{" "}
                                                                {submission.student_name_snapshot}
                                                                &apos;s submission
                                                            </span>
                                                        </summary>

                                                        <form
                                                            action={rejectAction}
                                                            className="mt-2 w-56 space-y-2 rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
                                                        >
                                                            <label
                                                                htmlFor={`feedback-${submission.id}`}
                                                                className="block text-xs font-semibold text-zinc-700"
                                                            >
                                                                Feedback (optional)
                                                            </label>
                                                            <input
                                                                id={`feedback-${submission.id}`}
                                                                type="text"
                                                                name="teacherFeedback"
                                                                maxLength={500}
                                                                placeholder="Reason or feedback"
                                                                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-[#c4122f] focus:ring-2 focus:ring-red-100"
                                                            />
                                                            <button
                                                                type="submit"
                                                                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#c4122f] px-3 text-sm font-semibold text-white transition hover:bg-[#a80f28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4122f] focus-visible:ring-offset-2"
                                                            >
                                                                <X className="size-4" />
                                                                Confirm rejection
                                                            </button>
                                                        </form>
                                                    </details>
                                                </>
                                            ) : null}

                                            <DeleteSubmissionButton
                                                deleteAction={deleteAction}
                                                studentName={
                                                    submission.student_name_snapshot
                                                }
                                            />
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {rows.length === 0 ? (
                    <p className="px-5 py-12 text-center text-sm text-zinc-500">
                        No documents have been submitted yet.
                    </p>
                ) : null}
            </section>
        </div>
    );
}

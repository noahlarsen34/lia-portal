import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import { ApplicationQrCode } from "@/components/application-qr-code";
import {
    acceptApplication,
    updateApplicationStatus,
} from "./actions";

type ApplicantsPageProps = {
    params: Promise<{
        classId: string;
    }>;
    searchParams: Promise<{
        error?: string;
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
    const { error } = await searchParams;
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

    const { data: applications } = await supabase
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
        .order("submitted_at", { ascending: false });
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000";
    const applicationUrl = `${appUrl}/apply/${liaClass.application_token}`;

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

                <div className="mt-5 grid gap-4 lg:gird-cols-[minmax(0,1fr)_auto">
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
                                    : "Something went wrong. Please try again."}
                </div>
            ) : null}

            <section className="mt-5 overflow-hidden rounded-md border border-red-100 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
                    <h2 className="text-xl font-semibold">Application Tracker</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                        Students who submitted the public application form.
                    </p>
                </div>

                {applications && applications.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-[1280px] table-fixed divide-y divide-zinc-200 text-sm">
                            <colgroup>
                                <col className="w-[135px]" />
                                <col className="w-[180px]" />
                                <col className="w-[70px]" />
                                <col className="w-[105px]" />
                                <col className="w-[115px]" />
                                <col className="w-[145px]" />
                                <col className="w-[110px]" />
                                <col className="w-[120px]" />
                                <col className="w-[120px]" />
                                <col className="w-[110px]" />
                                <col className="w-[170px]" />
                            </colgroup>
                            <thead className="bg-zinc-50 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3 align-middle">Student</th>
                                    <th className="px-4 py-3 align-middle">Email</th>
                                    <th className="px-4 py-3 text-center align-middle">Grade</th>
                                    <th className="px-4 py-3 align-middle">Color Team</th>
                                    <th className="px-4 py-3 text-center align-middle">Application</th>
                                    <th className="px-4 py-3 text-center align-middle">Recommendation</th>
                                    <th className="px-4 py-3 text-center align-middle">Interview</th>
                                    <th className="px-4 py-3 text-center align-middle">Interview Again</th>
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

                                    return (
                                        <tr key={application.id} className="align-middle">
                                            <td className="break-words px-4 py-4 font-semibold leading-5 [overflow-wrap:anywhere]">
                                                {studentName}
                                            </td>
                                            <td className="break-words px-4 py-4 text-zinc-700 [overflow-wrap:anywhere]">
                                                {application.email || "N/A"}
                                            </td>
                                            <td className="px-4 py-4 text-center text-zinc-700">
                                                {application.grade_level || "N/A"}
                                            </td>
                                            <td className="break-words px-4 py-4 text-zinc-700 [overflow-wrap:anywhere]">
                                                {application.color_team || "N/A"}
                                            </td>
                                            <td className="px-4 py-4 text-center text-zinc-700">
                                                {application.application_complete ? "Complete" : "Incomplete"}
                                            </td>
                                            <td className="px-4 py-4 text-center text-zinc-700">
                                                {application.recommendation_complete ? "Complete" : "Missing"}
                                            </td>
                                            <td className="px-4 py-4 text-center text-zinc-700">
                                                {application.completed_interview ? "Complete" : "Not yet"}
                                            </td>
                                            <td className="px-4 py-4 text-center text-zinc-700">
                                                {application.interview_again ? "Yes" : "No"}
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
                                                <div className="flex items-center justify-end gap-2 whitespace-nowrap">
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

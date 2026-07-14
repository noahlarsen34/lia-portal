import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import {
    acceptApplication,
    updateApplicationReview,
    updateApplicationStatus,
} from "../actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { studentTierOptions } from "@/utils/student-tier";

type ApplicantDetailPageProps = {
    params: Promise<{
        classId: string;
        applicationId: string;
    }>;
    searchParams: Promise<{
        error?: string;
        success?: string;
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
        return "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700";
    }

    if (status === "declined") {
        return "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold capitalize text-[#c4122f]";
    }

    if (status === "maybe") {
        return "rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold capitalize text-yellow-700";
    }

    return "rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold capitalize text-zinc-700";
}

function statusBanner(status: string) {
    if (status === "accepted") {
        return {
            className: "border-green-200 bg-green-50 text-green-800",
            title: "Application accepted",
            message:
                "This student has been accepted and moved into the class roster.",
        };
    }

    if (status === "declined") {
        return {
            className: "border-red-200 bg-red-50 text-red-800",
            title: "Application declined",
            message:
                "This student was not selected. A decision email is sent when email is configured.",
        };
    }

    if (status === "maybe") {
        return {
            className: "border-yellow-200 bg-yellow-50 text-yellow-800",
            title: "Marked as maybe",
            message:
                "This application needs more review before a final decision is made.",
        };
    }

    return {
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
        title: "Awaiting review",
        message:
            "Review the application, update the checklist, then accept or decline the student.",
    };
}
function formatAnswer(value: string | null | undefined) {
    return value?.trim() || "No response provided.";
}

export default async function ApplicantDetailPage({
    params,
    searchParams,
}: ApplicantDetailPageProps) {
    const { classId, applicationId } = await params;
    const { error, success } = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: application } = await supabase
        .from("lia_class_applications")
        .select(
            `
                id,
                lia_class_id,
                school_id,
                teacher_profile_id,
                status,
                first_name,
                last_name,
                email,
                grade_level,
                advisory_teacher,
                color_team,
                why_lia,
                skills_strengths,
                why_good_fit,
                extracurriculars,
                inspiration,
                academic_review,
                three_rs_review,
                application_complete,
                recommendation_complete,
                completed_interview,
                interview_again,
                teacher_comments,
                submitted_at,
                reviewed_at,
                lia_classes (
                    id,
                    name,
                    teacher_profile_id,
                    schools (
                        id,
                        name
                    )
                )
            `,
        )
        .eq("id", applicationId)
        .eq("lia_class_id", classId)
        .maybeSingle();

    const liaClass = Array.isArray(application?.lia_classes)
        ? application?.lia_classes[0]
        : application?.lia_classes;

    const school = Array.isArray(liaClass?.schools)
        ? liaClass?.schools[0]
        : liaClass?.schools;

    if (!application || !liaClass || liaClass.teacher_profile_id !== profile.id) {
        notFound();
    }

    const studentName = `${application.first_name} ${application.last_name}`.trim();
    const saveReview = updateApplicationReview.bind(null, classId, application.id);
    const markMaybe = updateApplicationStatus.bind(
        null,
        classId,
        application.id,
        "maybe",
    );
    const decline = updateApplicationStatus.bind(
        null,
        classId,
        application.id,
        "declined",
    );
    const accept = acceptApplication.bind(null, classId, application.id);

    const applicantDetails = [
        { label: "Email", value: application.email || "N/A" },
        { label: "Grade", value: application.grade_level || "N/A" },
        { label: "School", value: school?.name ?? "N/A" },
        { label: "Class", value: liaClass.name },
        { label: "Advisory Teacher", value: application.advisory_teacher || "N/A" },
        { label: "Color Team", value: application.color_team || "N/A" },
        { label: "Submitted", value: formatDate(application.submitted_at) },
        { label: "Reviewed", value: formatDate(application.reviewed_at) },
    ];

    const banner = statusBanner(application.status);
    const isAccepted = application.status === "accepted";
    const isDeclined = application.status === "declined";
    const isFinalDecision = isAccepted || isDeclined;
    const errorMessage =
        error === "update-failed"
            ? "Could not save the review details. Please try again."
            : error === "already-enrolled"
                ? "A student with this email is already enrolled in this class. Use a unique student email for new applicants."
                : error === "final-decision"
                    ? "This application already has a final decision and cannot be changed."
                    : error === "tier-required"
                        ? "Choose a student tier before accepting this applicant."
                        : error
                            ? "Something went wrong. Please try again."
                            : null;

    const answerSections = [
        {
            title: "Why do you want to join LIA?",
            value: application.why_lia,
        },
        {
            title: "Skills, interests, or strengths",
            value: application.skills_strengths,
        },
        {
            title: "Why would you be a great addition?",
            value: application.why_good_fit,
        },
        {
            title: "Extracurricular activities",
            value: application.extracurriculars,
        },
        {
            title: "Who or what inspires you?",
            value: application.inspiration,
        },
        {
            title: "Academic performance review",
            value: application.academic_review,
        },
        {
            title: "Ready, Respectful, Responsible reflection",
            value: application.three_rs_review,
        },
    ];

    return (
        <div className="mx-auto max-w-6xl">
            <Link
                href={`/teacher/classes/${classId}/applicants`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to applicants
            </Link>

            <header className="mt-5 rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                {errorMessage ? (
                    <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                {success === "review-saved" ? (
                    <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        Review details saved.
                    </div>
                ) : null}

                {success === "status-updated" ? (
                    <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        Application status updated.
                    </div>
                ) : null}

                <div className={`mb-5 rounded-md border px-4 py-3 ${banner.className}`}>
                    <p className="text-sm font-semibold">{banner.title}</p>
                    <p className="mt-1 text-sm">{banner.message}</p>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                            Applicant Review
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 className="break-words text-3xl font-semibold [overflow-wrap:anywhere]">
                                {studentName}
                            </h1>
                            <span className={statusClassName(application.status)}>
                                {application.status}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-600">
                            Review the student&apos;s application responses and update the
                            application decision.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <form action={markMaybe}>
                            <button
                                type="submit"
                                disabled={isFinalDecision || application.status === "maybe"}
                                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-yellow-200 bg-white px-4 text-sm font-semibold text-yellow-700 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                Mark Maybe
                            </button>
                        </form>
                        <form action={decline}>
                            <ConfirmSubmitButton
                                message={`Decline ${studentName}'s application?`}
                                disabled={isFinalDecision}
                                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-[#c4122f] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                Decline
                            </ConfirmSubmitButton>
                        </form>
                        <form action={accept} className="flex flex-col gap-2 sm:flex-row">
                            <select
                                name="tier"
                                required
                                disabled={isFinalDecision}
                                defaultValue=""
                                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                            >
                                <option value="">Choose tier</option>
                                {studentTierOptions.map((tier) => (
                                    <option key={tier.value} value={tier.value}>
                                        {tier.label} - {tier.description}
                                    </option>
                                ))}
                            </select>
                            <ConfirmSubmitButton
                                message={`Accept ${studentName}'s application?`}
                                disabled={isFinalDecision}
                                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:bg-zinc-300 sm:w-auto"
                            >
                                Accept Student
                            </ConfirmSubmitButton>
                        </form>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                    {applicantDetails.map((detail) => (
                        <div key={detail.label}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                {detail.label}
                            </p>
                            <p className="mt-1 break-words font-semibold text-zinc-950 [overflow-wrap:anywhere]">
                                {detail.value}
                            </p>
                        </div>
                    ))}
                </div>
            </header>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <section className="space-y-5">
                    {answerSections.map((section) => (
                        <article
                            key={section.title}
                            className="rounded-md border border-red-100 bg-white p-5 shadow-sm sm:p-6"
                        >
                            <h2 className="text-lg font-semibold text-zinc-950">
                                {section.title}
                            </h2>
                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700 [overflow-wrap:anywhere]">
                                {formatAnswer(section.value)}
                            </p>
                        </article>
                    ))}
                </section>

                <aside className="space-y-5">
                    <section className="rounded-md border border-red-100 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">Review Checklist</h2>
                        <form action={saveReview} className="mt-5 space-y-4">
                            <label className="flex items-start gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-3">
                                <input
                                    name="recommendation_complete"
                                    type="checkbox"
                                    defaultChecked={application.recommendation_complete}
                                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#c4122f]"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-zinc-950">
                                        Recommendation complete
                                    </span>
                                    <span className="block text-sm text-zinc-600">
                                        Required teacher recommendation has been received.
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-3">
                                <input
                                    name="completed_interview"
                                    type="checkbox"
                                    defaultChecked={application.completed_interview}
                                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#c4122f]"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-zinc-950">
                                        Interview complete
                                    </span>
                                    <span className="block text-sm text-zinc-600">
                                        Student has completed the interview.
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-3">
                                <input
                                    name="interview_again"
                                    type="checkbox"
                                    defaultChecked={application.interview_again}
                                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#c4122f]"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-zinc-950">
                                        Interview again
                                    </span>
                                    <span className="block text-sm text-zinc-600">
                                        Student should be invited for another interview.
                                    </span>
                                </span>
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-950">
                                    Teacher Comments
                                </span>
                                <textarea
                                    name="teacher_comments"
                                    rows={6}
                                    defaultValue={application.teacher_comments ?? ""}
                                    className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                                />
                            </label>

                            <button
                                type="submit"
                                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25]"
                            >
                                Save Review
                            </button>
                        </form>
                    </section>
                </aside>
            </div>
        </div>
    );
}

import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { updateAnnouncement } from "../../actions";

type EditAnnouncementPageProps = {
    params: Promise<{
        announcementId: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

const fieldClasses =
    "mt-2 w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100";

export default async function EditAnnouncementPage({
    params,
    searchParams,
}: EditAnnouncementPageProps) {
    const { announcementId } = await params;
    const { error } = await searchParams;
    const { supabase, profile } = await requireStaff();

    const { data: announcement, error: announcementError } = await supabase
        .from("announcements")
        .select(
            "id, title, body, audience, target_rpm_id, author_profile_id, status",
        )
        .eq("id", announcementId)
        .maybeSingle();

    const canManage =
        announcement &&
        (profile.role === "admin" ||
            (profile.role === "rpm" &&
                announcement.author_profile_id === profile.id &&
                announcement.target_rpm_id === profile.id));

    if (announcementError || !announcement || !canManage) {
        return (
            <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
                <DashboardSidebar />
                <section className="min-h-screen px-5 py-8 lg:ml-52 lg:px-10">
                    <div className="mx-auto max-w-4xl">
                        <Link
                            href="/announcements"
                            className="font-semibold text-[#c8102e] hover:text-[#a70d25]"
                        >
                            Back to announcements
                        </Link>
                        <div className="mt-6 rounded-md border border-red-100 bg-white p-6 shadow-sm">
                            <h1 className="text-2xl font-bold">
                                Announcement not found
                            </h1>
                            <p className="mt-2 text-zinc-600">
                                This announcement does not exist or you do not
                                have permission to edit it.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    const updateAnnouncementById = updateAnnouncement.bind(
        null,
        announcement.id,
    );
    const audienceMessage =
        announcement.audience === "all_teachers"
            ? "Visible to every teacher"
            : "Visible only to teachers assigned to your schools";

    const errorMessage =
        error === "missing-fields"
            ? "A title and message are required."
            : error === "content-too-long"
                ? "The title or message is too long."
                : error
                    ? "The announcement could not be updated. Please try again."
                    : null;

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-5 py-8 lg:ml-52 lg:px-10">
                <div className="mx-auto max-w-4xl">
                    <Link
                        href="/announcements"
                        className="font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to announcements
                    </Link>

                    <section className="mt-6 rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-10">
                        <p className="text-sm font-bold uppercase text-red-700">
                            Announcements
                        </p>
                        <h1 className="mt-2 text-3xl font-bold text-zinc-950">
                            Edit announcement
                        </h1>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-zinc-700">
                                {audienceMessage}
                            </span>
                            <span className="rounded-full bg-red-50 px-3 py-1 font-semibold capitalize text-red-700">
                                {announcement.status}
                            </span>
                        </div>

                        {errorMessage && (
                            <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
                                {errorMessage}
                            </div>
                        )}

                        <form
                            action={updateAnnouncementById}
                            className="mt-8 space-y-6"
                        >
                            <label className="block">
                                <span className="font-semibold text-zinc-800">
                                    Title
                                </span>
                                <input
                                    name="title"
                                    defaultValue={announcement.title}
                                    maxLength={160}
                                    required
                                    className={fieldClasses}
                                />
                            </label>

                            <label className="block">
                                <span className="font-semibold text-zinc-800">
                                    Message
                                </span>
                                <textarea
                                    name="body"
                                    defaultValue={announcement.body}
                                    rows={10}
                                    maxLength={10000}
                                    required
                                    className={fieldClasses}
                                />
                            </label>

                            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-end">
                                <Link
                                    href="/announcements"
                                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-5 py-3 font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    name="intent"
                                    value={
                                        announcement.status === "published"
                                            ? "save"
                                            : "draft"
                                    }
                                    className="min-h-11 rounded-md border border-zinc-300 px-5 py-3 font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                    Save changes
                                </button>
                                {announcement.status !== "published" && (
                                    <button
                                        type="submit"
                                        name="intent"
                                        value="publish"
                                        className="min-h-11 rounded-md bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                                    >
                                        Save and publish
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>
                </div>
            </section>
        </main>
    );
}

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { deleteAnnouncement } from "./actions";
import { DeleteAnnouncementButton } from "./delete-announcement-button";
import { WhatsAppShareButton } from "./whatsapp-share-button";

export default async function AnnouncementsPage() {
    const { supabase } = await requireStaff();

    const [
        { data: announcements, error: announcementsError },
        { data: communities, error: communitiesError },
    ] = await Promise.all([
        supabase
            .from("announcements")
            .select(
                "id, title, body, audience, target_rpm_id, status, published_at, created_at",
            )
            .order("created_at", { ascending: false }),
        supabase
            .from("rpm_whatsapp_communities")
            .select("rpm_profile_id, community_name, invite_url")
            .order("community_name"),
    ]);

    if (announcementsError) {
        throw new Error(
            `Could not load announcements: ${announcementsError.message}`,
        );
    }

    if (communitiesError) {
        throw new Error(
            `Could not load WhatsApp communities: ${communitiesError.message}`,
        );
    }

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-5 py-8 lg:ml-52 lg:px-10">
                <div className="mx-auto max-w-6xl">
                    <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase text-red-700">
                                Communications
                            </p>
                            <h1 className="mt-1 text-3xl font-bold text-zinc-950">
                                Announcements
                            </h1>
                            <p className="mt-2 text-zinc-600">
                                Publish announcements in the portal and share them to WhatsApp.
                            </p>
                        </div>

                        <Link
                            href="/announcements/new"
                            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
                        >
                            <Plus size={18} />
                            New announcements
                        </Link>
                    </header>

                    <div className="space-y-4">
                        {(announcements ?? []).map((announcement) => {
                            const deleteAnnouncementById =
                                deleteAnnouncement.bind(null, announcement.id);
                            const destinations =
                                announcement.audience === "rpm_teachers"
                                    ? (communities ?? []).filter(
                                        (commnuity) =>
                                            commnuity.rpm_profile_id ===
                                            announcement.target_rpm_id,
                                    )
                                    : communities ?? [];
                            
                            return (
                                <article
                                    key={announcement.id}
                                    className="rounded-md border border-red-100 bg-white p-6 shadow-sm"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-xl font-bold text-zinc-950">
                                                {announcement.title}
                                            </h2>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {announcement.audience === "all_teachers"
                                                    ? "All teachers"
                                                    : "RPM teachers"}
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase text-zinc-700">
                                            {announcement.status}
                                        </span>
                                    </div>

                                    <p className="mt-4 whitespace-pre-wrap leading-7 text-zinc-700">
                                        {announcement.body}
                                    </p>

                                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5">
                                        <div className="flex flex-wrap gap-3">
                                            {announcement.status === "published" &&
                                                destinations.map((community) => (
                                                    <WhatsAppShareButton
                                                        key={community.rpm_profile_id}
                                                        title={announcement.title}
                                                        body={announcement.body}
                                                        communityName={community.community_name}
                                                        communityUrl={community.invite_url}
                                                    />
                                                ))}
                                        </div>

                                        <div className="ml-auto flex flex-wrap items-center gap-2">
                                            <Link
                                                href={`/announcements/${announcement.id}/edit`}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                                            >
                                                <Pencil
                                                    className="size-4"
                                                    aria-hidden
                                                />
                                                Edit
                                            </Link>
                                            <DeleteAnnouncementButton
                                                deleteAction={
                                                    deleteAnnouncementById
                                                }
                                                announcementTitle={
                                                    announcement.title
                                                }
                                            />
                                        </div>
                                    </div>
                                </article>
                            );
                        })}

                        {!announcements?.length && (
                            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-600">
                                No announcements have been created yet.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    )
}

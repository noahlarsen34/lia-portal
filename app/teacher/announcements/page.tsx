import { ExternalLink, Megaphone } from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function TeacherAnnouncementsPage() {
    const { supabase, profile } = await requireTeacher();

    const { data: teacher } = await supabase
        .from("teachers")
        .select("school_id")
        .eq("profile_id", profile.id)
        .maybeSingle();
    
    let assignedRpmId: string | null = null;

    if (teacher?.school_id) {
        const { data: school } = await supabase
            .from("schools")
            .select("assigned_rpm_id")
            .eq("id", teacher.school_id)
            .maybeSingle();
        
        assignedRpmId = school?.assigned_rpm_id ?? null;
    }

    let announcementsQuery = supabase
        .from("announcements")
        .select("id, title, body, published_at, media_bucket, media_path, media_kind, media_mime_type, media_file_name")
        .eq("status", "published");

    announcementsQuery = assignedRpmId
        ? announcementsQuery.or(
            `audience.eq.all_teachers,target_rpm_id.eq.${assignedRpmId}`,
        )
        : announcementsQuery.eq("audience", "all_teachers");

    const [
        { data: announcements, error: announcementsError },
        { data: community, error: commnuityError },
    ] = await Promise.all([
        announcementsQuery.order("published_at", { ascending: false }),
        assignedRpmId
            ? supabase
                .from("rpm_whatsapp_communities")
                .select("community_name, invite_url")
                .eq("rpm_profile_id", assignedRpmId)
                .maybeSingle()
            : Promise.resolve({data: null, error: null}),
    ]);

    if (announcementsError) {
        throw new Error(
            `Could not load announcements: ${announcementsError.message}`,
        );
    }

    if (commnuityError) {
        throw new Error(
            `Could not load WhatsApp community: ${commnuityError.message}`,
        );
    }

    const admin = createAdminClient();
    const announcementsWithMedia = await Promise.all(
        (announcements ?? []).map(async (announcement) => {
            if (!announcement.media_bucket || !announcement.media_path) {
                return { ...announcement, mediaUrl: null };
            }

            const { data, error } = await admin.storage
                .from(announcement.media_bucket)
                .createSignedUrl(announcement.media_path, 60 * 60);

            if (error) {
                console.error("Announcement media URL creation failed", {
                    announcementId: announcement.id,
                    message: error.message,
                });
            }

            return { ...announcement, mediaUrl: data?.signedUrl ?? null };
        }),
    );

    return (
        <main className="min-h-screen bg-red-50/40 px-5 py-8 lg:px-10">
            <div className="mx-auto max-w-5xl">
                <header className="mb-7">
                    <p className="text-sm font-semibold uppercase text-red-700">
                        Communications
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-zinc-950">
                        Announcements
                    </h1>
                    <p className="mt-2 text-zinc-600">
                        Updates from Latinos In Action and your Regional Program Manager.
                    </p>
                </header>

                {community ? (
                    <section className="mb-7 flex flex-wrap items-center justify-between gap-5 rounded-md border border-green-200 bg-green-50 p-6">
                        <div>
                            <h2 className="text-lg font-bold text-green-950">
                                Join {community.community_name}
                            </h2>
                            <p className="mt-1 text-sm text-green-800">
                                Receive community updates and stay connected through WhatsApp.
                            </p>
                        </div>

                        <a
                            href={community.invite_url}
                            target="_blank"
                            rel="noopener,noreferrer"
                            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
                        >
                            Open WhatsApp
                            <ExternalLink size={17} />
                        </a>
                    </section>
                ) : (
                    <div className="mb-7 rounded-md border border-zinc-200 bg-white p-5 text-zinc-600">
                        Your WhatsApp Community link has not been configured yet.
                    </div>
                )}

                <div className="space-y-4">
                    {announcementsWithMedia.map((announcement) => (
                        <article
                            key={announcement.id}
                            className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm"
                        >
                            {announcement.mediaUrl && announcement.media_kind === "video" ? (
                                <div className="border-b border-zinc-200 bg-zinc-950">
                                    <video
                                        controls
                                        preload="metadata"
                                        playsInline
                                        className="mx-auto aspect-video max-h-[36rem] w-full object-contain"
                                    >
                                        <source
                                            src={announcement.mediaUrl}
                                            type={announcement.media_mime_type ?? undefined}
                                        />
                                        Your browser does not support video playback.
                                    </video>
                                </div>
                            ) : null}

                            {announcement.mediaUrl && announcement.media_kind === "image" ? (
                                <div
                                    role="img"
                                    aria-label={announcement.media_file_name ?? announcement.title}
                                    className="aspect-video w-full border-b border-zinc-200 bg-zinc-100 bg-contain bg-center bg-no-repeat"
                                    style={{ backgroundImage: `url(${JSON.stringify(announcement.mediaUrl)})` }}
                                />
                            ) : null}

                            <div className="flex items-start gap-4 p-6 sm:p-7">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                                    <Megaphone size={20} />
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-zinc-950">
                                        {announcement.title}
                                    </h2>

                                    {announcement.published_at && (
                                        <p className="mt-1 text-sm text-zinc-500">
                                            {new Intl.DateTimeFormat("en-US", {
                                                dateStyle: "medium",
                                            }).format(new Date(announcement.published_at))}
                                        </p>
                                    )}

                                    <p className="mt-4 whitespace-pre-wrap leading-7 text-zinc-700">
                                        {announcement.body}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}

                    {!announcementsWithMedia.length && (
                        <div className="rounded-md border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-600">
                            There are no announcements right now.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

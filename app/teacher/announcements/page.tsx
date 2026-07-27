import { ExternalLink, Megaphone } from "lucide-react";
import { requireTeacher } from "@/utils/role-guards";

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
        .select("id, title, body, published_at")
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

    return (
        <main className="min-h-scren bg-red-50/40 px-5 py-8 lg:px-10">
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
                    {(announcements ?? []).map((announcement) => (
                        <article
                            key={announcement.id}
                            className="rounded-md border border-red-100 bg-white p-6 shadow-sm"
                        >
                            <div className="flex items-start gap-4">
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

                    {!announcements?.length && (
                        <div className="rounded-md border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-600">
                            There are no announcements right now.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

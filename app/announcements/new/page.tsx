import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireStaff } from "@/utils/role-guards";
import { createAnnouncement } from "./actions";

type Props = {
    searchParams: Promise<{ error?: string }>;
};

export default async function NewAnnouncementPage({
    searchParams,
}: Props) {
    const { profile } = await requireStaff();
    const { error } = await searchParams;

    const audienceMessage =
        profile.role === "admin"
            ? "This announcement will be visible to every teacher."
            : "This announcement will only be visible to teachers assigned to your schools.";
    
    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-5 py-8 lg:ml-52 lg:px-10">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href="/announcements"
                        className="font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to announcements
                    </Link>

                <section className="mt-6 max-w-4xl rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-10">
                    <p className="text-sm font-bold uppercase text-red-700">
                        Announcements
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-zinc-950">
                        New announcement
                    </h1>

                    <p className="mt-2 text-zinc-600">{audienceMessage}</p>

                    {error && (
                        <div className="mt-6 border border-red-200 bg-red-50 p-4 text-red-800">
                            The announcmenet could not be created. Check the fields and try again.
                        </div>
                    )}

                    <form action={createAnnouncement} className="mt-8 space-y-6">
                        <div>
                            <label
                                htmlFor="title"
                                className="mb-2 block font-semibold text-zinc-800"
                            >
                                Title
                            </label>
                            <input
                                id="title"
                                name="title"
                                maxLength={160}
                                required
                                className="w-full rounded-md border border-zinc-300 px-4 py-3 text-zinc-950"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="body"
                                className="mb-2 block font-semibold text-zinc-800"
                            >
                                Message
                            </label>
                            <textarea
                                id="body"
                                name="body"
                                rows={10}
                                maxLength={10000}
                                required
                                className="w-full rounded-md border border-zinc-300 px-4 py-3 text-zinc-950"
                            />
                        </div>

                        <div className="flex justify-end gap-3 border-t border-zinc-200 pt-6">
                            <button
                                type="submit"
                                name="intent"
                                value="draft"
                                className="rounded-md border border-zinc-300 px-5 py-3 font-semibold text-zinc-700"
                            >
                                Save draft
                            </button>

                            <button
                                type="submit"
                                name="intent"
                                value="publish"
                                className="rounded-md bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                            >
                                Publish announcement
                            </button>
                        </div>
                    </form>
                    </section>
                </div>
            </section>
        </main>
    );
}

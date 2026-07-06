import { requireStudent } from "@/utils/role-guards";
import { signOut } from "@/app/login/actions";

export default async function StudentDashboardPage() {
    const { profile } = await requireStudent();

    return (
        <main className="min-h-screen bg-[#f8f4f4] px-6 py-8 text-zinc-950">
            <header className="mb-8 flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#b90f24]">
                        Student Portal
                    </p>
                    <h1 className="text-3xl font-semibold">
                        Welcome, {profile.full_name ?? "Student"}
                    </h1>
                    <p className="mt-2 text-zinc-600">
                        Your LIA student dashboard is ready for Phase 2.
                    </p>
                </div>

                <form action={signOut}>
                    <button
                        type="submit"
                        className="rounded-md bg-[#b90f24] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9f0d1f]"
                    >
                        Sign out
                    </button>
                </form>
            </header>

            <section className="rounded-lg border border-red-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Student access confirmed</h2>
                <p className="mt-2 text-zinc-600">
                    This page is protected for students, with admin preview access enabled.
                </p>
            </section>
        </main>
    );
}

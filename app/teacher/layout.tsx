import { TeacherSidebar } from "@/components/teacher-sidebar";
import { LiaisonSidebar } from "@/components/liaison-sidebar";
import { requireAuth, requireDistrictLiaison } from "@/utils/role-guards";

export default async function TeacherLayout ({
    children,
} : {
    children: React.ReactNode;
}) {
    const { profile } = await requireAuth();
    const isDistrictLiaison = profile.role === "district_liaison";

    if (isDistrictLiaison) {
        await requireDistrictLiaison();
    }

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            {isDistrictLiaison ? <LiaisonSidebar /> : <TeacherSidebar />}
            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
                {children}
            </section>
        </main>
    );
}

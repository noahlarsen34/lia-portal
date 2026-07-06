import { TeacherSidebar } from "@/components/teacher-sidebar";

export default function TeacherLayout ({
    children,
} : {
    children: React.ReactNode;
}) {
    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <TeacherSidebar />
            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
                {children}
            </section>
        </main>
    );
}

import { LiaisonSidebar } from "@/components/liaison-sidebar";

export default function LiaisonLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <LiaisonSidebar />
            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
                {children}
            </section>
        </main>
    );
}

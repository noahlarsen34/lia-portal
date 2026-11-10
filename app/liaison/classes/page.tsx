import { School } from "lucide-react";
import { requireDistrictLiaison } from "@/utils/role-guards";

export default async function LiaisonClassesPage() {
    await requireDistrictLiaison();

    return (
        <div className="mx-auto max-w-6xl">
            <header className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    District Classes
                </p>
                <h1 className="mt-2 text-3xl font-semibold">Classes by School</h1>
            </header>
            <section className="rounded-md border border-red-100 bg-white p-8 text-center shadow-sm">
                <School className="mx-auto h-10 w-10 text-[#c4122f]" aria-hidden />
                <h2 className="mt-4 text-xl font-semibold">Class workspace is ready</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                    School grouping, district filters, and read-only class access are
                    intentionally reserved for the next implementation milestone.
                </p>
            </section>
        </div>
    );
}

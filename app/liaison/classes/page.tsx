import { requireDistrictLiaison } from "@/utils/role-guards";
import { getLiaisonSchoolGroups } from "@/utils/district-liaison-data";
import { DistrictClassesWorkspace } from "./district-classes-workspace";

export default async function LiaisonClassesPage() {
    const { liaison } = await requireDistrictLiaison();
    const { districts, schools } = await getLiaisonSchoolGroups(liaison.id);

    return (
        <div className="mx-auto max-w-6xl">
            <header className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    District Classes
                </p>
                <h1 className="mt-2 text-3xl font-semibold">Classes by School</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                    Browse every LIA school and class in your assigned districts.
                    Class details will become available in the next milestone.
                </p>
            </header>
            {districts.length ? (
                <DistrictClassesWorkspace districts={districts} schools={schools} />
            ) : (
                <section className="rounded-md border border-red-100 bg-white p-8 text-center shadow-sm">
                    <h2 className="text-xl font-semibold">No assigned districts</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                        Contact an LIA administrator to assign at least one district to your liaison account.
                    </p>
                </section>
            )}
        </div>
    );
}

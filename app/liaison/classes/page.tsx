import { requireDistrictLiaison } from "@/utils/role-guards";
import { getLiaisonSchoolGroups } from "@/utils/district-liaison-data";
import { DistrictClassesWorkspace } from "./district-classes-workspace";

export default async function LiaisonClassesPage() {
    const { liaison } = await requireDistrictLiaison();
    const { districts, schools } = await getLiaisonSchoolGroups(liaison.id);
    const classCount = schools.reduce(
        (total, school) => total + school.classes.length,
        0,
    );

    return (
        <div className="mx-auto max-w-6xl">
            <header className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    District Classes
                </p>
                <h1 className="mt-2 text-3xl font-semibold">Classes by School</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                    Browse every LIA school and class in your assigned districts.
                    Select a class to open its read-only district liaison view.
                </p>
            </header>
            {!districts.length ? (
                <section className="rounded-md border border-red-100 bg-white p-8 text-center shadow-sm">
                    <h2 className="text-xl font-semibold">No assigned districts</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                        Contact an LIA administrator to assign at least one district to your liaison account.
                    </p>
                </section>
            ) : !schools.length ? (
                <section className="rounded-md border border-red-100 bg-white p-8 text-center shadow-sm">
                    <h2 className="text-xl font-semibold">No schools in assigned districts</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                        Your district assignments are active, but no LIA schools are currently connected to them.
                    </p>
                </section>
            ) : (
                <>
                    {!classCount ? (
                        <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                            Your assigned schools are available, but they do not have any LIA classes yet.
                        </div>
                    ) : null}
                    <DistrictClassesWorkspace districts={districts} schools={schools} />
                </>
            )}
        </div>
    );
}

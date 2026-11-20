import Link from "next/link";
import { BookOpen, Map, School, Users, type LucideIcon } from "lucide-react";
import { requireDistrictLiaison } from "@/utils/role-guards";
import { getLiaisonSchoolGroups } from "@/utils/district-liaison-data";

export default async function LiaisonDashboardPage() {
    const { profile, liaison } = await requireDistrictLiaison();
    const { districts, schools, studentCount } =
        await getLiaisonSchoolGroups(liaison.id);
    const classCount = schools.reduce(
        (total, school) => total + school.classes.length,
        0,
    );
    const activeClassCount = schools.reduce(
        (total, school) =>
            total + school.classes.filter((liaClass) => liaClass.status === "active").length,
        0,
    );
    const summaryCards: Array<{
        label: string;
        value: number;
        icon: LucideIcon;
    }> = [
        { label: "Assigned Districts", value: districts.length, icon: Map },
        { label: "Schools", value: schools.length, icon: School },
        { label: "Active Classes", value: activeClassCount, icon: BookOpen },
        { label: "Students", value: studentCount, icon: Users },
    ];

    return (
        <div className="mx-auto max-w-6xl">
            <header className="mb-6 rounded-md border border-red-100 bg-white px-6 py-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    District Liaison Portal
                </p>
                <h1 className="mt-2 text-3xl font-semibold">
                    Welcome, {profile.full_name ?? "District Liaison"}
                </h1>
                <p className="mt-2 max-w-2xl text-zinc-600">
                    View the LIA schools and classes in your assigned district
                    {districts.length === 1 ? "" : "s"}.
                </p>
            </header>

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div
                            key={card.label}
                            className="rounded-md border border-red-100 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500">
                                        {card.label}
                                    </p>
                                    <p className="mt-2 text-3xl font-semibold text-zinc-950">
                                        {card.value.toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#c4122f]">
                                    <Icon className="h-5 w-5" aria-hidden />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Assigned districts</h2>
                    {districts.length ? (
                        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                            {districts.map((district) => (
                                <li
                                    key={district.id}
                                    className="rounded-md border border-zinc-200 px-4 py-3"
                                >
                                    <span className="font-medium">{district.name}</span>
                                    {district.state ? (
                                        <span className="text-zinc-500"> · {district.state}</span>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm text-zinc-600">
                            No districts are assigned yet. Contact an LIA administrator.
                        </p>
                    )}
                </section>

                <Link
                    href="/liaison/classes"
                    className="group rounded-md border border-red-100 bg-white p-6 shadow-sm transition hover:border-red-200 hover:shadow-md"
                >
                    <School className="h-9 w-9 text-[#c4122f]" aria-hidden />
                    <h2 className="mt-5 text-lg font-semibold">District Classes</h2>
                    <p className="mt-2 text-sm text-zinc-600">
                        Browse {schools.length} school{schools.length === 1 ? "" : "s"} and {classCount} class{classCount === 1 ? "" : "es"} across your assigned districts.
                    </p>
                    <p className="mt-5 text-sm font-semibold text-[#c4122f]">
                        Open District Classes →
                    </p>
                </Link>
            </div>
        </div>
    );
}

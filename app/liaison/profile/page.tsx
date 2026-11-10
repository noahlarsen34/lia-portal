import { requireDistrictLiaison } from "@/utils/role-guards";

export default async function LiaisonProfilePage() {
    const { profile, user } = await requireDistrictLiaison();

    return (
        <div className="mx-auto max-w-3xl">
            <header className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Profile
                </p>
                <h1 className="mt-2 text-3xl font-semibold">District Liaison Profile</h1>
            </header>
            <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                <dl className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                            Name
                        </dt>
                        <dd className="mt-1 font-medium text-zinc-950">
                            {profile.full_name ?? "Not provided"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                            Email
                        </dt>
                        <dd className="mt-1 font-medium text-zinc-950">
                            {profile.email ?? user.email ?? "Not provided"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                            Portal role
                        </dt>
                        <dd className="mt-1 font-medium text-zinc-950">
                            District Liaison
                        </dd>
                    </div>
                </dl>
            </section>
        </div>
    );
}

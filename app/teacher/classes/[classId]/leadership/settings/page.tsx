import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/utils/role-guards";
import {
    archiveCommittee,
    archiveRole,
    createCommittee,
    createRole,
} from "./actions";

type LeadershipSettingsPageProps = {
    params: Promise<{ classId: string }>;
    searchParams: Promise<{
        error?: string;
        success?: string;
    }>;
};

const errorMessages: Record<string, string> = {
    "invalid-committee": "Enter a committee name between 1 and 60 characters.",
    "invalid-role": "Enter a role name between 1 and 60 characters.",
    "duplicate-committee": "That committee already exists in this class.",
    "duplicate-role": "That role already exists in this class.",
    "create-failed": "The option could not be created.",
    "archive-failed": "The option could not be archived.",
};

const successMessages: Record<string, string> = {
    "committee-created": "Committee created.",
    "role-created": "Role created.",
    "committee-archived": "Committee archived.",
    "role-archived": "Role archived.",
};

export default async function LeadershipSettingsPage({
    params,
    searchParams,
}: LeadershipSettingsPageProps) {
    const { classId } = await params;
    const { error, success } = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, name")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();

    if (!liaClass) {
        notFound();
    }

    const [
        { data: committees, error: committeesError },
        { data: roles, error: rolesError },
    ] = await Promise.all([
        supabase
            .from("lia_class_committees")
            .select("id, name, is_default, sort_order")
            .eq("lia_class_id", classId)
            .is("archived_at", null)
            .order("sort_order")
            .order("name"),
        supabase
            .from("lia_class_roles")
            .select(
                "id, name, role_scope, max_assignees, is_default, sort_order",
            )
            .eq("lia_class_id", classId)
            .is("archived_at", null)
            .order("sort_order")
            .order("name"),
    ]);

    if (committeesError || rolesError) {
        throw new Error("Could not load class leadership settings.");
    }

    const createCommitteeForClass = createCommittee.bind(null, classId);
    const createRoleForClass = createRole.bind(null, classId);

    return (
        <div className="mx-auto max-w-5xl">
            <Link
                href={`/teacher/classes/${classId}/leadership`}
                className="text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]"
            >
                Back to leadership
            </Link>

            <header className="mt-5 rounded-md border border-red-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase text-[#c4122f]">
                    Leadership settings
                </p>
                <h1 className="mt-2 text-3xl font-semibold">
                    Manage Committees &amp; Roles
                </h1>
                <p className="mt-2 text-zinc-600">{liaClass.name}</p>
            </header>

            {error ? (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {errorMessages[error] ?? "Something went wrong."}
                </div>
            ) : null}

            {success ? (
                <div className="mt-5 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    {successMessages[success] ?? "Changes saved."}
                </div>
            ) : null}

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Committees</h2>

                    <form
                        action={createCommitteeForClass}
                        className="mt-5 flex flex-col gap-3 sm:flex-row"
                    >
                        <input
                            name="name"
                            required
                            maxLength={60}
                            placeholder="Example: Fundraising"
                            className="h-11 min-w-0 flex-1 rounded-md border border-zinc-300 px-3"
                        />
                        <button
                            type="submit"
                            className="h-11 rounded-md bg-[#c4122f] px-4 font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Add committee
                        </button>
                    </form>

                    <div className="mt-6 divide-y divide-zinc-100">
                        {(committees ?? []).map((committee) => {
                            const archiveAction = archiveCommittee.bind(
                                null,
                                classId,
                                committee.id,
                            );

                            return (
                                <div
                                    key={committee.id}
                                    className="flex items-center justify-between gap-4 py-4"
                                >
                                    <div>
                                        <p className="font-medium text-zinc-950">
                                            {committee.name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {committee.is_default
                                                ? "Standard committee"
                                                : "Custom committee"}
                                        </p>
                                    </div>

                                    {!committee.is_default ? (
                                        <form action={archiveAction}>
                                            <button
                                                type="submit"
                                                className="text-sm font-semibold text-red-700 hover:text-red-900"
                                            >
                                                Archive
                                            </button>
                                        </form>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-md border border-red-100 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Roles</h2>

                    <form action={createRoleForClass} className="mt-5 space-y-4">
                        <input
                            name="name"
                            required
                            maxLength={60}
                            placeholder="Example: Fundraising Chair"
                            className="h-11 w-full rounded-md border border-zinc-300 px-3"
                        />

                        <label className="block">
                            <span className="text-sm font-medium text-zinc-800">
                                Role type
                            </span>
                            <select
                                name="role_scope"
                                defaultValue="class"
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3"
                            >
                                <option value="class">Class-wide role</option>
                                <option value="committee">
                                    Belongs to a committee
                                </option>
                            </select>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                name="allow_multiple"
                                className="size-4"
                            />
                            <span className="text-sm text-zinc-700">
                                Multiple students can hold this role
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="h-11 rounded-md bg-[#c4122f] px-4 font-semibold text-white hover:bg-[#a70d25]"
                        >
                            Add role
                        </button>
                    </form>

                    <div className="mt-6 divide-y divide-zinc-100">
                        {(roles ?? []).map((role) => {
                            const archiveAction = archiveRole.bind(
                                null,
                                classId,
                                role.id,
                            );

                            return (
                                <div
                                    key={role.id}
                                    className="flex items-center justify-between gap-4 py-4"
                                >
                                    <div>
                                        <p className="font-medium text-zinc-950">
                                            {role.name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {role.role_scope === "committee"
                                                ? "Committee role"
                                                : "Class-wide role"}
                                            {" · "}
                                            {role.max_assignees === null
                                                ? "Multiple students"
                                                : `Maximum ${role.max_assignees}`}
                                        </p>
                                    </div>

                                    {!role.is_default ? (
                                        <form action={archiveAction}>
                                            <button
                                                type="submit"
                                                className="text-sm font-semibold text-red-700 hover:text-red-900"
                                            >
                                                Archive
                                            </button>
                                        </form>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}

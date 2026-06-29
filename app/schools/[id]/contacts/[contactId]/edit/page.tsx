import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { updateContact } from "./actions";

type EditContactPageProps = {
  params: Promise<{
    id: string;
    contactId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditContactPage({
  params,
  searchParams,
}: EditContactPageProps) {
  const { id, contactId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: school } = await supabase
    .from("schools")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!school) {
    redirect("/schools");
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, first_name, last_name, role, email, phone, status, notes")
    .eq("id", contactId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (!contact) {
    redirect(`/schools/${school.id}`);
  }

  const updateContactForSchool = updateContact.bind(
    null,
    school.id,
    contact.id,
  );
  const contactDisplayName =
    `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
    contact.name;

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />

      <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/schools/${school.id}`}
            className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
          >
            Back to {school.name}
          </Link>

          <section className="mt-5 rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                Edit Contact
              </p>
              <h1 className="mt-2 break-words text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">
                {contactDisplayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Update this contact record.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error === "missing-fields"
                  ? "First name, last name, role, and status are required."
                  : "Something went wrong. Please try again."}
              </div>
            ) : null}

            <form action={updateContactForSchool} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="text-sm font-medium text-zinc-800">
                    First Name
                  </span>
                  <input
                    name="first_name"
                    required
                    defaultValue={contact.first_name ?? ""}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="text-sm font-medium text-zinc-800">
                    Last Name
                  </span>
                  <input
                    name="last_name"
                    required
                    defaultValue={contact.last_name ?? ""}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="text-sm font-medium text-zinc-800">
                    Role
                  </span>
                  <select
                    name="role"
                    required
                    defaultValue={contact.role}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  >
                    <option value="District Liaison">District Liaison</option>
                    <option value="Principal">Principal</option>
                    <option value="Assistant Principal">
                      Assistant Principal
                    </option>
                    <option value="Teacher">Teacher</option>
                    <option value="Elementary Partner">Elementary Partner</option>
                    <option value="Administrator">Administrator</option>
                    <option value="School Phone Number">School Phone Number</option>
                    <option value="Other School Rep">Other School Rep</option>
                  </select>
                </label>

                <label className="block min-w-0">
                  <span className="text-sm font-medium text-zinc-800">
                    Status
                  </span>
                  <select
                    name="status"
                    required
                    defaultValue={contact.status}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="text-sm font-medium text-zinc-800">
                    Email
                  </span>
                  <input
                    name="email"
                    type="email"
                    defaultValue={contact.email ?? ""}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="text-sm font-medium text-zinc-800">
                    Phone
                  </span>
                  <input
                    name="phone"
                    defaultValue={contact.phone ?? ""}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                  />
                </label>
              </div>

              <label className="block min-w-0">
                <span className="text-sm font-medium text-zinc-800">Notes</span>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={contact.notes ?? ""}
                  className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                <Link
                  href={`/schools/${school.id}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c8102e] sm:w-auto"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

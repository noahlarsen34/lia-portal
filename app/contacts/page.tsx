import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/utils/supabase/server";
import { ContactsTable } from "./contacts-table";

export default async function ContactsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select(`
            id,
            school_id,
            first_name,
            last_name,
            name,
            role,
            email,
            phone,
            status,
            notes
        `)
        .order("last_name", { ascending: true });

    const { data: schoolRows } = await supabase
        .from("schools")
        .select("id, name, state, district_id, assigned_rpm_id");

    const { data: districtRows } = await supabase
        .from("districts")
        .select("id, name");

    const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name");

    const schoolsById = new Map(
        schoolRows?.map((school) => [school.id, school]) ?? [],
    );

    const districtsById = new Map(
        districtRows?.map((district) => [district.id, district.name]) ?? [],
    );

    const profilesById = new Map(
        profileRows?.map((profile) => [profile.id, profile.full_name]) ?? [],
    );

    const contactRows =
        contacts?.map((contact) => {
            const school = schoolsById.get(contact.school_id);

            const displayName =
                `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
                contact.name ||
                "Unnamed Contact";

            return {
                id: contact.id,
                schoolId: contact.school_id,
                name: displayName,
                firstName: contact.first_name ?? "",
                lastName: contact.last_name ?? "",
                role: contact.role,
                email: contact.email ?? "N/A",
                phone: contact.phone ?? "N/A",
                status: contact.status,
                notes: contact.notes ?? "",
                schoolName: school?.name ?? "N/A",
                state: school?.state ?? "N/A",
                district: school?.district_id
                    ? districtsById.get(school.district_id) ?? "N/A"
                    : "N/A",
                rpm: school?.assigned_rpm_id
                    ? profilesById.get(school.assigned_rpm_id) ?? "Unassigned"
                    : "Unassigned",
            };
        }) ?? [];

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="ml-64 min-h-screen px-8 py-6">
                <div className="mx-auto max-w-7xl">
                    <header className="mb-8">
                        <p className="text-sm font-medium uppercase tracking-wide text-[#c8102e]">
                            Contacts Database
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold">Contacts</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            View and search contact records across all accessible schools.
                        </p>
                    </header>

                    <section className="rounded-lg border border-red-100 bg-white p-6 shadow-sm">
                        <ContactsTable
                            contacts={contactRows}
                            userRole={profile?.role ?? "rpm"}
                        />

                        {contactsError ? (
                            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                Could not load contacts: {contactsError.message}
                            </p>
                        ) : null}

                        {!contactsError && contactRows.length === 0 ? (
                            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                                No contacts found yet.
                            </div>
                        ) : null}
                    </section>
                </div>
            </section>
        </main>
    );
}

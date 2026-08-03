import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { createClient } from '@/utils/supabase/server';
import { TeachersTable } from './teachers-table';

export default async function TeachersPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    const { data: teachers, error: teachersError } = await supabase
        .from("teachers")
        .select(`
            id,
            school_id,
            first_name,
            last_name,
            name,
            email,
            phone,
            status,
            username,
            password_status,
            portal_access_status,
            invited_at,
            activated_at,
            is_new_teacher
        `)
        .order("last_name", { ascending: true });

    const { data: schoolRows } = await supabase
            .from("schools")
            .select("id, name, state, district_id, assigned_rpm_id");
        
    const { data: districtRows} = await supabase
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

    const teacherRows =
        teachers?.map((teacher) => {
            const school = schoolsById.get(teacher.school_id);

            const displayName =
                `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
                teacher.name ||
                "Unnamed Teacher";
            
            return {
                id: teacher.id,
                schoolId: teacher.school_id,
                name: displayName,
                firstName: teacher.first_name ?? "",
                lastName: teacher.last_name ?? "",
                email: teacher.email ?? "N/A",
                phone: teacher.phone ?? "N/A",
                status: teacher.status,
                username: teacher.username ?? "N/A",
                passwordStatus: teacher.password_status ?? "not invited",
                portalAccessStatus:
                    teacher.portal_access_status ??
                    (teacher.password_status === "invited"
                        ? "invited"
                        : teacher.password_status === "active"
                            ? "active"
                            : "not_invited"),
                invitedAt: teacher.invited_at,
                activatedAt: teacher.activated_at,
                isNewTeacher: teacher.is_new_teacher ?? false,
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
        <main className='min-h-screen bg-[#f8f4f4] text-zinc-950'>
            <DashboardSidebar />

            <section className='min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8'>
                <div className='mx-auto w-full max-w-7xl'>
                    <header className='mb-8'>
                        <p className='text-sm font-medium uppercase tracking-wide text-[#c8102e]'>
                            Teachers Database
                        </p>
                        <h1 className='mt-2 text-3xl font-semibold'>Teachers</h1>
                        <p className='mt-1 text-sm text-zinc-600'>
                            View and search teacher records across all accessible schools.
                        </p>
                    </header>

                    <section className='overflow-hidden rounded-lg border border-red-100 bg-white p-4 shadow-sm sm:p-6'>
                        <TeachersTable
                            teachers={teacherRows}
                            userRole={profile?.role ?? "rpm"}
                        />

                        {teachersError ? (
                            <p className='mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                                Could not load teachers: {teachersError.message}
                            </p>
                        ) : null}

                        {!teachersError && teacherRows.length === 0 ? (
                            <div className='mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500'>
                                No teachers found yet.
                            </div>
                        ) : null}
                    </section>
                </div>
            </section>
        </main>
    );
    
}

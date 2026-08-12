import { createClient } from '@/utils/supabase/server';
import {
    DashboardSidebarClient,
    type DashboardLink,
} from './dashboard-sidebar-client';

const sharedLinks: DashboardLink[] = [
    { href: '/dashboard', label: 'Home' },
    { href: '/schools', label: "Schools"},
    { href: "/announcements", label: "Announcements" }, 
];

const adminLinks: DashboardLink[] = [
    { href: "/events", label: "Events" },
    { href: '/districts', label: "Districts" },
    { href: "/activity-log", label: "Activity Log" },
    { href: "/contacts", label: "Contacts" },
    { href: "/teachers", label: "Teachers" },
    { href: "/documents", label: "Documents" },
    { href: "/users", label: "Users" },
];

const rpmLinks: DashboardLink[] = [
    { href: "/activity-log", label: "Activity Log" },
    { href: "/contacts", label: "Contacts" },
    { href: "/teachers", label: "Teachers" },
    { href: "/documents", label: "Documents" },
];


export async function DashboardSidebar() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .maybeSingle()
        : {data : null};
    
    const role = profile?.role?? "rpm";
    const isAdmin = role === "admin";
    const links = [...sharedLinks, ...(isAdmin? adminLinks : rpmLinks)];
    const displayName = profile?.full_name ?? user?.email ?? "LIA User";
    const roleLabel = isAdmin ? "Administrator" : "RPM";

    return (
        <DashboardSidebarClient
            links={links}
            displayName={displayName}
            roleLabel={roleLabel}
        />
    );
}

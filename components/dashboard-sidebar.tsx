import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

const sharedLinks = [
    { href: '/dashboard', label: 'Home' },
    { href: '/schools', label: "Schools"},
];

const adminLinks = [
    { href: '/districts', label: "Districts" },
    { href: "#", label: "Activity Log" },
    { href: "#", label: "Contacts" },
    { href: "#", label: "Teachers" },
    { href: "#", label: "Documents" },
    { href: "#", label: "Reports" },
    { href: "/users", label: "Users" },
    { href: "#", label: "Settings" },
];

const rpmLinks = [
    { href: "#", label: "Activity Log" },
    { href: "#", label: "Contacts" },
    { href: "#", label: "Teachers" },
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

    return (
        <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col bg-[#b90f24] px-5 py-6 text-white">
            <div className="mb-10">
                <div className="mb-8 rounded-md bg-white p-3">
                    <Image
                        src='/lia-logo.png'
                        alt="Latinos in Action logo"
                        width={170}
                        height={70}
                        className='h-auto w-full'
                        priority
                    />
                </div>
            </div>

            <nav className='flex flex-1 flex-col gap-2'>
                {links.map((link) => 
                    link.href === "#" ? (
                        <span
                            key={link.label}
                            className='rounded-md px-4 py-3 font-semibold text-white/70'
                        >
                            {link.label}
                        </span>
                    ) : (
                        <Link
                            key={link.label}
                            href={link.href}
                            className='rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10'
                        >
                            {link.label}
                        </Link>
                    )
                )}
            </nav>

            <div className="rounded-md border border-white/20 bg-white/10 p-3 text-sm">
                <div className="font-semibold">{profile?.full_name ?? user?.email}</div>
                <div className ="text-white/70 capitalize">{isAdmin ? "Administrator" : "RPM"}</div>
            </div>
        </aside>
    );
}

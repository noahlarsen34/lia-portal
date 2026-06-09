import Image from 'next/image';
import Link from 'next/link';

export function DashboardSidebar() {
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
                {/* <div className="text-xs font-semibold uppercase tracking-wide">
                    Latinos In Action
                </div> */}
            </div>

            <nav className="flex flex-1 flex-col gap-2">
                <Link
                href="/dashboard"
                className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10">
                    Home
                </Link>
                <Link 
                href="/schools"
                className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10"
                >
                Schools
                </Link>
                <Link
                href="/districts"
                className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10"
                >
                    Districts
                </Link>
                <a className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10">
                    Activity Log
                </a>
                <a className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10">
                    Contacts 
                </a>
                <a className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10">
                    Teachers
                </a>
                <a className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10">
                    Documents
                </a>
                <a className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10">
                    Reports
                </a>
                <a className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10">
                    Users
                </a>
                <a className="rounded-md px-4 py-3 font-semibold text-white/90 hover:bg-white/10">
                    Settings
                </a>
            </nav>

            <div className="rounded-md border border-white/20 bg-white/10 p-3 text-sm">
                <div className="font semibold">Noah Admin</div>
                <div className ="text-white/70">Administrator</div>
            </div>
        </aside>
    );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export type DashboardLink = {
  href: string;
  label: string;
};

type DashboardSidebarClientProps = {
  links: DashboardLink[];
  displayName: string;
  roleLabel: string;
};

function DashboardNav({
  links,
  onNavigate,
}: {
  links: DashboardLink[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-3">
      {links.map((link) => {
        const isCurrent =
          link.href !== "#" &&
          (pathname === link.href || pathname.startsWith(`${link.href}/`));
        const className = isCurrent
          ? "rounded-md bg-white px-3 py-3.5 font-semibold text-[#b90f24] shadow-sm"
          : "rounded-md px-3 py-3.5 font-semibold text-white/90 transition hover:bg-white/10";

        return link.href === "#" ? (
          <span
            key={link.label}
            className="rounded-md px-3 py-3.5 font-semibold text-white/60"
          >
            {link.label}
          </span>
        ) : (
          <Link
            key={link.label}
            href={link.href}
            className={className}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({
  displayName,
  roleLabel,
}: {
  displayName: string;
  roleLabel: string;
}) {
  return (
    <div className="rounded-md border border-white/20 bg-white/10 p-3 text-sm">
      <div className="break-words font-semibold [overflow-wrap:anywhere]">
        {displayName}
      </div>
      <div className="text-white/70 capitalize">{roleLabel}</div>
    </div>
  );
}

export function DashboardSidebarClient({
  links,
  displayName,
  roleLabel,
}: DashboardSidebarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-red-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="min-w-0">
            <Image
              src="/lia-logo.png"
              alt="Latinos in Action logo"
              width={144}
              height={60}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden min-w-0 text-right sm:block">
              <div className="truncate text-sm font-semibold text-zinc-950">
                {displayName}
              </div>
              <div className="text-xs text-zinc-500">{roleLabel}</div>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:bg-red-50 hover:text-[#b90f24]"
              aria-label="Open navigation menu"
              aria-expanded={isOpen}
              onClick={() => setIsOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-52 flex-col bg-[#b90f24] text-white lg:flex">
        <Link
          href="/dashboard"
          className="block border-r border-red-100 bg-[#f8f4f4] px-4 py-5"
        >
            <Image
              src="/lia-logo.png"
              alt="Latinos in Action logo"
              width={170}
              height={70}
              className="h-auto w-full"
              priority
            />
        </Link>

        <div className="flex min-h-0 flex-1 flex-col px-4 py-5">
          <DashboardNav links={links} />
          <UserCard displayName={displayName} roleLabel={roleLabel} />
        </div>
      </aside>

      <div
        className={
          isOpen
            ? "fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] lg:hidden"
            : "pointer-events-none fixed inset-0 z-50 bg-black/0 lg:hidden"
        }
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={
          isOpen
            ? "fixed left-0 top-0 z-50 flex h-dvh w-[min(20rem,86vw)] translate-x-0 flex-col bg-[#b90f24] text-white shadow-2xl transition-transform duration-200 lg:hidden"
            : "fixed left-0 top-0 z-50 flex h-dvh w-[min(20rem,86vw)] -translate-x-full flex-col bg-[#b90f24] text-white shadow-2xl transition-transform duration-200 lg:hidden"
        }
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between gap-3 bg-[#f8f4f4] px-5 py-5">
          <Link href="/dashboard" onClick={() => setIsOpen(false)}>
            <Image
              src="/lia-logo.png"
              alt="Latinos in Action logo"
              width={150}
              height={62}
              className="h-auto w-40"
              priority
            />
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:bg-red-50 hover:text-[#b90f24]"
            aria-label="Close navigation menu"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
          <DashboardNav links={links} onNavigate={() => setIsOpen(false)} />
          <UserCard displayName={displayName} roleLabel={roleLabel} />
        </div>
      </aside>
    </>
  );
}

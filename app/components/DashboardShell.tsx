"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaHome, FaHistory, FaUser, FaSignOutAlt } from "react-icons/fa";

const navItems = [
  { href: "/home", label: "Home", icon: FaHome },
  { href: "/history", label: "History", icon: FaHistory },
  { href: "/profile", label: "Profile", icon: FaUser },
];

function SidebarLink({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: typeof FaHome; isActive: boolean; }) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${isActive ? "bg-white/20 shadow-xl text-white font-semibold" : "text-slate-100 hover:bg-white/10"}`}>
        <Icon size={22} />
        <span className="text-base sm:text-lg">{label}</span>
      </div>
    </Link>
  );
}

export default function DashboardShell({
  children,
  pageTitle,
  pageDescription,
}: {
  children: ReactNode;
  pageTitle: string;
  pageDescription: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-900">
      <div className="relative min-h-screen flex overflow-hidden">
        <aside className="hidden xl:flex w-72 flex-col bg-gradient-to-b from-sky-600 via-sky-500 to-sky-600 p-6 text-white shadow-xl">
          <div className="mb-10">
            <div className="mb-4 rounded-3xl bg-white/10 p-4 text-center shadow-inner">
              <p className="text-sm uppercase tracking-[0.3em] text-sky-100/80">Smart Waste</p>
              <h2 className="mt-3 text-2xl font-semibold">ระบบจัดการขยะ</h2>
            </div>
          </div>

          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href}
              />
            ))}
          </nav>

          <div className="grow" />
          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 flex items-center justify-center gap-2 rounded-3xl bg-white/10 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
          >
            <FaSignOutAlt size={18} />
            Logout
          </button>
        </aside>

        <main className="flex-1 p-6 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl shadow-slate-200/30 backdrop-blur-sm sm:p-8">
              <div className="mb-8">
                <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                  dashboard
                </span>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  {pageTitle}
                </h1>
                <p className="mt-3 max-w-2xl text-slate-600 sm:text-lg">
                  {pageDescription}
                </p>
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

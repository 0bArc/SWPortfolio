"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  X,
} from "lucide-react";

const NAV = [
  { href: "/author", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/author/editor", label: "Posts", icon: FileText, exact: false },
];

export default function AuthorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleLogout() {
    await fetch("/api/accounts/logout", { method: "POST", credentials: "same-origin" });
    router.push("/account/login");
    router.refresh();
  }

  const navLink = (href: string, label: string, Icon: typeof LayoutDashboard, exact: boolean) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={close}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-white/8 text-white"
            : "text-gray-500 hover:text-gray-300 hover:bg-white/4"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <p className="text-sm font-semibold text-white">kristiansen.icu</p>
        <div className="w-9" aria-hidden />
      </header>

      {open && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/70 mobile-nav-backdrop"
          style={{ top: "3.5rem" }}
          onClick={close}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-[#0a0a0a] border-r border-white/5 flex flex-col z-50 transition-transform duration-200 ease-out md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:top-0 top-14 md:h-full h-[calc(100%-3.5rem)]`}
      >
        <div className="hidden md:block px-5 py-5 border-b border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Author</p>
          <p className="text-sm font-semibold text-white mt-0.5">kristiansen.icu</p>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon, exact }) => navLink(href, label, icon, exact))}
        </nav>

        <div className="px-2 py-3 border-t border-white/5 space-y-0.5">
          <Link
            href="/author/editor/new"
            onClick={close}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-300 hover:bg-white/4 transition-colors"
          >
            <Plus className="w-4 h-4 shrink-0" />
            New Post
          </Link>
          <Link
            href="/"
            target="_blank"
            onClick={close}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-300 hover:bg-white/4 transition-colors"
          >
            <Globe className="w-4 h-4 shrink-0" />
            View Site
          </Link>
          <button
            type="button"
            onClick={() => {
              close();
              void handleLogout();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

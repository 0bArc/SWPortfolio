"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE_OWNER } from "@/lib/env";
import { useI18n } from "@/providers/I18nProvider";
import AccountNav from "@/components/site/account/AccountNav";
import NotificationNav from "@/components/site/notifications/NotificationNav";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.8 1.31 3.48 1 .11-.77.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.23a11.53 11.53 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.64.25 2.86.12 3.16.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.82.58A12 12 0 0 0 12 .5z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const pill = "px-2.5 py-1 rounded-lg hover:bg-white/8 hover:text-white transition-all";
const mobileLink =
  "flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/8 hover:text-white transition-colors";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const a = (hash: string) => (isHome ? hash : `/${hash}`);
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

  const links = (
    <>
      <Link href={a("#arbeid")} className={pill} onClick={close}>
        {t("nav.work")}
      </Link>
      <Link href="/blog" className={pill} onClick={close}>
        {t("nav.blog")}
      </Link>
      <Link
        href="/profil"
        className={`${pill} flex items-center gap-1.5`}
        onClick={close}
        title={t("nav.profile")}
      >
        <GithubIcon className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">{t("nav.profile")}</span>
      </Link>
      <NotificationNav pillClass={pill} />
      <AccountNav pillClass={pill} />
    </>
  );

  return (
    <nav style={{ top: "var(--banner-h, 0px)" }} className="fixed w-full z-50 glass border-b border-white/[0.06]">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="min-w-0 text-xs sm:text-sm font-bold tracking-tighter leading-tight hover:text-gray-300 transition-colors"
          >
            {SITE_OWNER.toUpperCase()}
          </Link>

          <div className="hidden md:flex items-center gap-0.5 text-xs font-medium text-gray-400">
            {links}
          </div>

          <button
            type="button"
            className="md:hidden shrink-0 p-2 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>

        {open && (
          <>
            <button
              type="button"
              className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-black/70 mobile-nav-backdrop"
              style={{ top: "calc(var(--banner-h, 0px) + 3.5rem)" }}
              onClick={close}
              aria-label="Close menu"
            />
            <div
              id="mobile-nav"
              className="md:hidden absolute left-0 right-0 top-full z-50 mobile-nav-panel border-b border-white/[0.08] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
            >
              <Link href={a("#arbeid")} className={mobileLink} onClick={close}>
                {t("nav.work")}
              </Link>
              <Link href="/blog" className={mobileLink} onClick={close}>
                {t("nav.blog")}
              </Link>
              <Link href="/profil" className={mobileLink} onClick={close}>
                <GithubIcon className="w-4 h-4" />
                {t("nav.profile")}
              </Link>
              <div className="px-4 py-2 flex items-center gap-2">
                <NotificationNav />
              </div>
              <AccountNav pillClass={mobileLink} />
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

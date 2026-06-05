"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_OWNER } from "@/lib/env";
import { useI18n } from "@/providers/I18nProvider";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.8 1.31 3.48 1 .11-.77.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.23a11.53 11.53 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.64.25 2.86.12 3.16.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.82.58A12 12 0 0 0 12 .5z" />
    </svg>
  );
}

const pill = "px-3 py-1.5 rounded-lg hover:bg-white/8 hover:text-white transition-all";

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const a = (hash: string) => (isHome ? hash : `/${hash}`);

  return (
    <nav style={{ top: "var(--banner-h, 0px)" }} className="fixed w-full z-50 glass border-b border-white/[0.06]">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-bold tracking-tighter hover:text-gray-300 transition-colors"
        >
          {SITE_OWNER.toUpperCase()}
        </Link>

        <div className="flex items-center gap-0.5 text-xs font-medium text-gray-400">
          <Link href={a("#arbeid")} className={pill}>
            {t("nav.work")}
          </Link>
          <Link href={a("#prosjekter")} className={pill}>
            {t("nav.projects")}
          </Link>
          <Link href="/blog" className={pill}>
            {t("nav.blog")}
          </Link>
          <Link href="/profil" className={`${pill} flex items-center gap-1.5`}>
            <GithubIcon className="w-3.5 h-3.5" />
            {t("nav.profile")}
          </Link>

          <div className="w-px h-4 bg-white/10 mx-1.5" />

          <button
            onClick={() => setLang(lang === "no" ? "en" : "no")}
            className={`${pill} font-bold tracking-widest`}
          >
            {lang === "no" ? "EN" : "NO"}
          </button>
        </div>
      </div>
    </nav>
  );
}

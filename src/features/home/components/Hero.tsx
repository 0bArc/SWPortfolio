"use client";

import Link from "next/link";
import { Mail, PenLine } from "lucide-react";
import { CONTACT_EMAIL, GITHUB_URL } from "@/lib/env";
import { useI18n } from "@/providers/I18nProvider";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.8 1.31 3.48 1 .11-.77.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.23a11.53 11.53 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.64.25 2.86.12 3.16.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.82.58A12 12 0 0 0 12 .5z" />
    </svg>
  );
}

export default function Hero() {
  const { t } = useI18n();
  return (
    <section id="om" className="mb-20 reveal">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
        {t("hero.title")}
      </h1>
      <p className="text-lg text-gray-400 max-w-xl leading-relaxed mb-8">
        {t("hero.bio")}
      </p>
      <div className="flex gap-3">
        <Link
          href={`mailto:${CONTACT_EMAIL}`}
          className="bg-white text-black px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          {t("hero.contact")}
        </Link>
        <Link
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="glass px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <GithubIcon className="w-4 h-4" />
          GitHub
        </Link>
        <Link
          href="/blog"
          className="glass px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <PenLine className="w-4 h-4" />
          {t("hero.blog")}
        </Link>
      </div>
      <div className="mt-6 text-gray-500 text-xs font-bold uppercase tracking-[0.22em] flex items-center gap-2 reveal reveal-delay-1">
        <GithubIcon className="w-4 h-4 text-gray-300" />
        <span>{t("hero.openSource")}</span>
      </div>
    </section>
  );
}

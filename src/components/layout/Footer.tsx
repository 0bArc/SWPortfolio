"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/I18nProvider";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.8 1.31 3.48 1 .11-.77.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.23a11.53 11.53 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.64.25 2.86.12 3.16.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.82.58A12 12 0 0 0 12 .5z" />
    </svg>
  );
}

function featuredLabel(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return null;
  }
}

export default function Footer({
  siteOwner,
  githubUrl,
  featuredWork,
}: {
  siteOwner: string;
  githubUrl: string;
  featuredWork: string;
}) {
  const { t } = useI18n();
  const [year, setYear] = useState<number | null>(null);
  const workLabel = featuredWork ? featuredLabel(featuredWork) : null;

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="max-w-4xl mx-auto px-6 py-8">
      <Separator className="bg-white/10 mb-8" />
      <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
        <p className="text-gray-300" suppressHydrationWarning>
          © {year ?? "…"} {siteOwner.toUpperCase()} ·{" "}
          <Link href="/terms" className="hover:text-white transition-colors">
            {t("nav.terms")}
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-white transition-colors">
            {t("nav.privacy")}
          </Link>
        </p>
        <div className="flex gap-4">
          <Link
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            GITHUB
          </Link>
          {workLabel && (
            <Link
              href={featuredWork}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors uppercase tracking-wider"
            >
              {workLabel}
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { RepoDetail } from "@/lib/github";
import { useI18n } from "@/providers/I18nProvider";

export default function ProjectsClient({ repos }: { repos: RepoDetail[] }) {
  const { t } = useI18n();
  const filtered = repos.filter((r) => !r.fork);

  return (
    <section id="prosjekter" className="reveal reveal-delay-2">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">{t("projects.heading")}</h2>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((repo) => (
          <Link
            key={repo.id}
            href={`/projekter/${repo.name}`}
            className="glass p-5 rounded-xl card-hover flex flex-col justify-between group"
          >
            <div>
              <h4 className="font-bold text-sm text-white mb-1">{repo.name}</h4>
              <p className="text-[12px] text-gray-500 line-clamp-1 mb-4">
                {repo.description ?? t("projects.fallbackDesc")}
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-600 font-bold uppercase tracking-wider">
              <span>{repo.language ?? t("projects.fallbackLang")}</span>
              <ChevronRight className="w-3 h-3 group-hover:text-gray-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star, GitFork, AlertCircle, Eye, ExternalLink, GitBranch } from "lucide-react";
import { useI18n } from "@/providers/I18nProvider";
import ActivityHeatmap from "./ActivityHeatmap";
import CommitList from "./CommitList";
import type { RepoData, Branch } from "@/lib/github";

interface RepoResponse {
  data: RepoData;
  branches: Branch[];
}

function Skeleton() {
  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <div className="h-4 w-32 bg-white/5 rounded mb-8 animate-pulse" />
      <div className="h-10 w-64 bg-white/5 rounded mb-4 animate-pulse" />
      <div className="h-4 w-96 bg-white/5 rounded mb-10 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass p-4 rounded-xl h-16 animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass p-4 rounded-xl h-16 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

export default function ProjectPageClient({ slug }: { slug: string }) {
  const { t } = useI18n();
  const [repo, setRepo] = useState<RepoResponse | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setRepo(null);
    setMissing(false);
    fetch(`/api/repo/${slug}`)
      .then((r) => {
        if (!r.ok) { setMissing(true); return null; }
        return r.json() as Promise<RepoResponse>;
      })
      .then((d) => { if (d) setRepo(d); });
  }, [slug]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(t("dateLocale"), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (missing) {
    return (
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <Link href="/#prosjekter" className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("project.back")}
        </Link>
        <p className="text-gray-500 text-sm">404</p>
      </main>
    );
  }

  if (!repo) return <Skeleton />;

  const { detail, commits, activity } = repo.data;
  const branches = repo.branches;

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <Link
        href="/#prosjekter"
        className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("project.back")}
      </Link>

      <div className="mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{detail.name}</h1>
            {detail.description && (
              <p className="text-gray-400 text-base max-w-xl leading-relaxed">{detail.description}</p>
            )}
          </div>
          {detail.homepage && (
            <Link
              href={detail.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="glass px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2 shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              Demo
            </Link>
          )}
        </div>
        {detail.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {detail.topics.map((topic) => (
              <span key={topic} className="text-[10px] bg-white/5 px-2 py-1 rounded border border-white/10 uppercase font-bold text-gray-400">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { icon: Star, label: "Stars", value: detail.stargazers_count },
          { icon: GitFork, label: "Forks", value: detail.forks_count },
          { icon: Eye, label: "Watchers", value: detail.watchers_count },
          { icon: AlertCircle, label: "Issues", value: detail.open_issues_count },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="glass p-4 rounded-xl flex items-center gap-3">
            <Icon className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {branches.length > 0 && (
        <Link
          href={`/projekter/${slug}/branches`}
          className="glass p-4 rounded-xl card-hover flex items-center justify-between group mb-10"
        >
          <div className="flex items-center gap-3">
            <GitBranch className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-lg font-bold text-white">{branches.length}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Branches</p>
            </div>
          </div>
          <span className="text-xs text-gray-600 group-hover:text-gray-300 transition-colors flex items-center gap-1">
            {t("project.seeAll")} <ExternalLink className="w-3 h-3" />
          </span>
        </Link>
      )}

      <div className="glass p-4 rounded-xl mb-10 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-400">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-600 mb-1">{t("project.langLabel")}</p>
          <p className="text-white">{detail.language ?? t("project.unknown")}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-600 mb-1">{t("project.created")}</p>
          <p>{fmt(detail.created_at)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-600 mb-1">{t("project.lastPush")}</p>
          <p>{fmt(detail.pushed_at)}</p>
        </div>
      </div>

      {activity.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">{t("project.activity")}</h2>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <div className="glass p-5 rounded-xl">
            <ActivityHeatmap activity={activity} />
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-4 mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">{t("project.commits")}</h2>
          <div className="h-px flex-1 bg-white/5" />
          <Link
            href={`${detail.html_url}/commits`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-500 hover:text-white transition-colors flex items-center gap-1"
          >
            {t("project.seeAll")} <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <CommitList commits={commits} repoUrl={detail.html_url} />
      </section>
    </main>
  );
}

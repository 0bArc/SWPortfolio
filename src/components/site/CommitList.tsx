"use client";

import { useState } from "react";
import Link from "next/link";
import { GitCommitHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import type { Commit } from "@/lib/github";
import { useI18n } from "@/providers/I18nProvider";

const PAGE_SIZE = 5;

interface Props {
  commits: Commit[];
  repoUrl: string;
}

function shortSha(sha: string) {
  return sha.slice(0, 7);
}

function firstLine(msg: string) {
  return msg.split("\n")[0];
}

export default function CommitList({ commits, repoUrl }: Props) {
  const [page, setPage] = useState(0);
  const { t } = useI18n();

  const dateLocale = t("dateLocale");

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (commits.length === 0) {
    return <p className="text-sm text-gray-600">{t("project.noCommits")}</p>;
  }

  const totalPages = Math.ceil(commits.length / PAGE_SIZE);
  const visible = commits.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="space-y-2 mb-4">
        {visible.map((c) => (
          <Link
            key={c.sha}
            href={c.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="glass p-4 rounded-xl card-hover flex items-start gap-4 group block"
          >
            <GitCommitHorizontal className="w-4 h-4 text-gray-400 group-hover:text-white mt-0.5 shrink-0 transition-colors" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate leading-snug">
                {firstLine(c.commit.message)}
              </p>
              <p className="text-[11px] text-gray-300 mt-1">
                {c.commit.author.name} · {fmt(c.commit.author.date)}
              </p>
            </div>
            <span className="text-[10px] font-mono text-gray-300 group-hover:text-white shrink-0 transition-colors">
              {shortSha(c.sha)}
            </span>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1.5 text-xs text-gray-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors glass px-3 py-1.5 rounded-lg"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            {t("project.previous")}
          </button>

          <span className="text-[11px] text-gray-200">
            {page + 1} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex items-center gap-1.5 text-xs text-gray-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors glass px-3 py-1.5 rounded-lg"
          >
            {t("project.next")}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

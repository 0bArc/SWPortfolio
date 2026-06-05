"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/providers/I18nProvider";
import type { PostMeta } from "@/lib/posts";

export default function BlogTeaser({ posts = [] }: { posts?: Pick<PostMeta, "slug" | "title" | "excerpt" | "date" | "tags">[] }) {
  const latest = posts.slice(0, 2);
  const { t, lang } = useI18n();

  if (latest.length === 0) return null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "no" ? "no-NO" : "en-GB", {
      day: "numeric",
      month: "short",
    });

  return (
    <section id="innlegg" className="mb-20 reveal reveal-delay-3">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">
          {t("blog.heading")}
        </h2>
        <div className="h-px flex-1 bg-white/5" />
        <Link
          href="/blog"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          {t("blog.seeAll")} <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {latest.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="glass p-4 rounded-xl card-hover flex items-center justify-between group"
          >
            <div className="min-w-0 mr-4">
              <p className="font-semibold text-sm text-white">{post.title}</p>
              <p className="text-[12px] text-gray-500 line-clamp-1 mt-0.5">{post.excerpt}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3 text-[10px] text-gray-600 font-bold uppercase tracking-wider">
              <span>{fmtDate(post.date)}</span>
              {post.tags[0] && <span className="text-gray-700">#{post.tags[0]}</span>}
              <ChevronRight className="w-3 h-3 group-hover:text-gray-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Eye, Plus, ArrowRight } from "lucide-react";
import { getAccountSessionId } from "@/features/accounts/services/auth/session";
import { listPostsByAccount } from "@/features/blog/services/posts";

export const metadata: Metadata = { title: "Dashboard – Author" };

export default async function AuthorPage() {
  const accountId = await getAccountSessionId();
  const posts = accountId ? await listPostsByAccount(accountId) : [];
  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;

  const stats = [
    { label: "Total posts", value: posts.length, icon: FileText, href: "/author/editor" },
    { label: "Published", value: published, icon: Eye, href: "/author/editor" },
    { label: "Drafts", value: drafts, icon: FileText, href: "/author/editor" },
  ];

  const recent = posts.slice(0, 5);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
          Overview
        </p>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="glass rounded-xl p-5 card-hover group">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600">
                {label}
              </p>
              <Icon className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
          </Link>
        ))}
      </div>

      <div className="mb-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-4">
          Quick actions
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/author/editor/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New post
          </Link>
          <Link
            href="/author/editor"
            className="flex items-center gap-2 px-4 py-2.5 glass text-gray-300 text-sm font-medium rounded-xl card-hover"
          >
            <FileText className="w-4 h-4" />
            All posts
          </Link>
        </div>
      </div>

      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600">
              Recent posts
            </p>
            <Link
              href="/author/editor"
              className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="glass rounded-xl overflow-hidden">
            {recent.map((post, i) => (
              <Link
                key={post.slug}
                href={`/author/editor/${post.slug}`}
                className={`flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors ${
                  i < recent.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{post.title}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5 font-mono">{post.date}</p>
                </div>
                <span
                  className={`ml-4 shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    post.status === "published"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-white/5 text-gray-500"
                  }`}
                >
                  {post.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

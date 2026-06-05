import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { listPosts } from "@/lib/posts";
import DeletePostButton from "@/components/admin/DeletePostButton";

export const metadata: Metadata = { title: "Posts – Admin" };

export default async function AdminPostsPage() {
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  try {
    posts = await listPosts();
  } catch {
    // DB not reachable — show empty state
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
            Content
          </p>
          <h1 className="text-2xl font-bold text-white">Posts</h1>
        </div>
        <Link
          href="/admin/posts/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-sm text-gray-600 mb-4">No posts yet.</p>
          <Link
            href="/admin/posts/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Write your first post
          </Link>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_120px_100px_80px] gap-4 px-5 py-3 border-b border-white/5">
            {["Title", "Status", "Tags", "Date", ""].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                {h}
              </p>
            ))}
          </div>

          {posts.map((post, i) => (
            <div
              key={post.slug}
              className={`grid grid-cols-[1fr_80px_120px_100px_80px] gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors ${
                i < posts.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{post.title}</p>
                <p className="text-[11px] text-gray-600 font-mono mt-0.5">{post.slug}</p>
              </div>

              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${
                  post.status === "published"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-white/5 text-gray-500"
                }`}
              >
                {post.status}
              </span>

              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
                {post.tags.length > 2 && (
                  <span className="text-[10px] text-gray-700">+{post.tags.length - 2}</span>
                )}
              </div>

              <p className="text-[12px] text-gray-600 font-mono">{post.date}</p>

              <div className="flex items-center gap-1 justify-end">
                {post.status === "published" && (
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="p-1.5 rounded-lg text-gray-700 hover:text-gray-300 hover:bg-white/5 transition-colors"
                    title="View post"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                <Link
                  href={`/admin/posts/${post.slug}`}
                  className="p-1.5 rounded-lg text-gray-700 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  title="Edit post"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
                <DeletePostButton slug={post.slug} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { connection } from "next/server";
import { listPosts } from "@/features/blog/services/posts";
import AdminPostsList from "@/features/admin/components/AdminPostsList";

export const metadata: Metadata = { title: "Posts – Admin" };

export default async function AdminPostsPage() {
  await connection();
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  try {
    posts = await listPosts();
  } catch {
    // DB not reachable — show empty state
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
            Content
          </p>
          <h1 className="text-2xl font-bold text-white">Posts</h1>
        </div>
        <Link
          href="/admin/posts/new"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors shrink-0"
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
        <AdminPostsList initialPosts={posts} />
      )}
    </div>
  );
}

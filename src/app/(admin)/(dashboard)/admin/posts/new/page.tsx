import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PostEditor from "@/components/admin/PostEditor";

export const metadata: Metadata = { title: "New Post – Admin" };

export default function NewPostPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/posts"
          className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors mb-4"
        >
          <ChevronLeft className="w-3 h-3" /> Posts
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
          New post
        </p>
        <h1 className="text-2xl font-bold text-white">Create post</h1>
      </div>
      <PostEditor mode="create" />
    </div>
  );
}

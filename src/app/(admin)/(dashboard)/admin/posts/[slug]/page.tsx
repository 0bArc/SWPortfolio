import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/posts";
import PostEditor from "@/components/admin/PostEditor";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Edit: ${slug} – Admin` };
}

export default async function EditPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <Link
          href="/admin/posts"
          className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors mb-4"
        >
          <ChevronLeft className="w-3 h-3" /> Posts
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
          Editing
        </p>
        <h1 className="text-2xl font-bold text-white">{post.title}</h1>
      </div>
      <PostEditor
        mode="edit"
        initial={{
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          featuredImage: post.featuredImage ?? "",
          content: post.content,
          tags: post.tags.join(", "),
          author: post.author,
          status: post.status,
          date: post.date,
        }}
      />
    </div>
  );
}

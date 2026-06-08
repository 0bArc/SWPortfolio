import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/site/NavbarWrapper";
import Footer from "@/components/site/FooterWrapper";
import TagBadge from "@/components/site/TagBadge";
import PostAuthor from "@/components/site/PostAuthor";
import { getPublishedPost } from "@/lib/blog/posts";
import { renderBlogMarkdown } from "@/lib/markdown/render";
import BlogProse from "@/components/site/BlogProse";
import { translations, get } from "@/lib/i18n";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
  };
}

async function PostContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const tr = (path: string) => get(translations, path);
  const html = renderBlogMarkdown(post.content);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(translations.dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <main className="max-w-4xl mx-auto px-6 md:px-10 pt-24 pb-16">
      <Link
        href="/blog"
        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 mb-8 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        {tr("blog.back")}
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{post.title}</h1>

      <div className="flex flex-col gap-3 mb-8 pb-6 border-b border-white/[0.12]">
        <div className="flex items-center gap-4 flex-wrap">
          <PostAuthor />
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} href={`/blog?tag=${tag}`} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-600 font-bold uppercase tracking-wider">
          <span>{fmtDate(post.date)}</span>
          <span>·</span>
          <span>{post.readingTime} {tr("blog.readMin")}</span>
        </div>
      </div>

      <BlogProse html={html} />
    </main>
  );
}

export default function BlogPostPage({ params }: Props) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<main className="max-w-4xl mx-auto px-6 md:px-10 pt-24 pb-16 animate-pulse h-96" />}>
        <PostContent params={params} />
      </Suspense>
      <Footer />
    </>
  );
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import TagBadge from "@/features/blog/components/TagBadge";
import PostAuthor from "@/features/blog/components/PostAuthor";
import { getPublishedPost, lookupAccountIcons } from "@/features/blog/services/posts";
import { getPostAuthorDisplayBadge } from "@/features/blog/services/post-authors";
import { renderBlogMarkdown } from "@/lib/markdown/render";
import BlogProse from "@/features/blog/components/BlogProse";
import PostComments from "@/features/blog/components/PostComments";

async function PostCommentsSection({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PostComments postSlug={slug} />;
}
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

  const authorBadge = post.accountId
    ? await getPostAuthorDisplayBadge(post.accountId)
    : null;

  let authorIcon = post.authorIcon ?? null;
  if (!authorIcon) {
    try {
      const icons = await lookupAccountIcons(
        post.authorUsername ? [post.authorUsername] : [],
        [post.author]
      );
      authorIcon =
        (post.authorUsername ? icons.get(`user:${post.authorUsername}`) : undefined) ??
        icons.get(`name:${post.author.toLowerCase()}`) ??
        null;
    } catch {
      // optional
    }
  }

  return (
    <>
      <Link
        href="/blog"
        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 mb-8 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        {tr("blog.back")}
      </Link>

      <h1 className="text-[26px] md:text-[31px] font-bold tracking-tight leading-tight mb-3">{post.title}</h1>

      <div className="flex flex-col gap-2 mb-6 pb-5 border-b border-white/[0.12]">
        <PostAuthor
          name={post.author}
          username={post.authorUsername}
          icon={authorIcon}
          badge={authorBadge}
          tags={
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} href={`/blog?tag=${tag}`} />
              ))}
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-600 font-bold uppercase tracking-wider">
          <span>{fmtDate(post.date)}</span>
          <span>·</span>
          <span>{post.readingTime} {tr("blog.readMin")}</span>
        </div>
      </div>

      <BlogProse html={html} />
    </>
  );
}

export default function BlogPostPage({ params }: Props) {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 md:px-10 pt-24 pb-16">
        <Suspense fallback={<div className="animate-pulse h-96 rounded-xl bg-white/[0.03]" />}>
          <PostContent params={params} />
        </Suspense>
        <Suspense
          fallback={
            <div className="mt-12 pt-8 border-t border-white/[0.12] h-48 animate-pulse rounded-lg bg-white/[0.03]" />
          }
        >
          <PostCommentsSection params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

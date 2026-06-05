import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { marked } from "marked";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/FooterWrapper";
import TagBadge from "@/components/site/TagBadge";
import PostAuthor from "@/components/site/PostAuthor";
import { getPost, getSortedPosts } from "@/content/blog";
import { getLang } from "@/lib/lang";
import { translations, get } from "@/lib/i18n";
import { translatePost } from "@/lib/translate";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

const contentMap: Record<string, () => Promise<{ content: string }>> = {
  "hei-verden": () => import("@/content/blog/hei-verden"),
};

export function generateStaticParams() {
  return getSortedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post || !contentMap[slug]) notFound();

  const lang = await getLang();
  const t = (path: string) => get(translations[lang], path);
  const dateLocale = get(translations[lang], "dateLocale");

  const { content: rawContent } = await contentMap[slug]();

  const { title, body } =
    lang === "en"
      ? await translatePost(slug, post.title, post.excerpt, rawContent)
      : { title: post.title, body: rawContent };

  const html = await marked(body, { async: false });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 md:px-10 pt-24 pb-16">
        <Link
          href="/blog"
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 mb-8 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          {t("blog.back")}
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{title}</h1>

        <div className="flex flex-col gap-2 mb-8 pb-6 border-b border-white/[0.12]">
          <PostAuthor />
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-600 font-bold uppercase tracking-wider">
            <span>{fmtDate(post.date)}</span>
            <span>·</span>
            <span>{post.readingTime} {t("blog.readMin")}</span>
            {post.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} href={`/blog?tag=${tag}`} />
            ))}
          </div>
        </div>

        <div className="prose-blog" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <Footer />
    </>
  );
}

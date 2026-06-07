import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/site/NavbarWrapper";
import Footer from "@/components/site/FooterWrapper";
import { listPublishedPosts, getAllTags, type PostMeta } from "@/lib/posts";
import { getLang } from "@/lib/lang";
import { translations, get } from "@/lib/i18n";
import { translatePostMeta } from "@/lib/translate";
import TagBadge from "@/components/site/TagBadge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Innlegg – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
};

interface Props {
  searchParams: Promise<{ tag?: string }>;
}

async function PostList({ searchParams }: Props) {
  const { tag: activeTag } = await searchParams;
  const lang = await getLang();
  const t = (path: string) => get(translations[lang], path);
  const dateLocale = get(translations[lang], "dateLocale");

  let allPosts: PostMeta[] = [];
  let allTags: string[] = [];
  try {
    [allPosts, allTags] = await Promise.all([listPublishedPosts(), getAllTags()]);
  } catch {
    // DB unavailable
  }

  const filtered = activeTag ? allPosts.filter((p) => p.tags.includes(activeTag)) : allPosts;

  const posts: (PostMeta & { displayTitle: string; displayExcerpt: string })[] =
    await Promise.all(
      filtered.map(async (post) => {
        if (lang === "en") {
          const { title, excerpt } = await translatePostMeta(post.slug, post.title, post.excerpt);
          return { ...post, displayTitle: title, displayExcerpt: excerpt };
        }
        return { ...post, displayTitle: post.title, displayExcerpt: post.excerpt };
      })
    );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-sm font-bold uppercase tracking-widest text-gray-500">
          {t("blog.heading")}
        </h1>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/blog"
            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              !activeTag ? "bg-white text-black" : "glass text-gray-500 hover:text-gray-300"
            }`}
          >
            {t("blog.all")}
          </Link>
          {allTags.map((tag) => (
            <Link
              key={tag}
              href={`/blog?tag=${tag}`}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTag === tag ? "bg-white text-black" : "glass text-gray-500 hover:text-gray-300"
              }`}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-gray-600">{t("blog.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="glass p-5 rounded-xl card-hover group"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="font-bold text-sm text-white">{post.displayTitle}</h2>
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider shrink-0">
                  {fmtDate(post.date)}
                </span>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
                {post.displayExcerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-600 font-bold uppercase tracking-wider group-hover:text-gray-400 transition-colors">
                  {post.readingTime} {t("blog.readMin")}
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function BlogPage(props: Props) {
  return (
    <>
      <Navbar />
      <Suspense>
        <PostList {...props} />
      </Suspense>
      <Footer />
    </>
  );
}

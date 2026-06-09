import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import { listPublishedPosts, getAllTags } from "@/features/blog/services/posts";
import { translations, get } from "@/lib/i18n";
import TagBadge from "@/features/blog/components/TagBadge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Posts – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
};

interface Props {
  searchParams: Promise<{ tag?: string }>;
}

async function PostList({ searchParams }: Props) {
  const { tag: activeTag } = await searchParams;
  const tr = (path: string) => get(translations, path);
  const dateLocale = translations.dateLocale;

  let allPosts: Awaited<ReturnType<typeof listPublishedPosts>> = [];
  let allTags: string[] = [];
  try {
    [allPosts, allTags] = await Promise.all([listPublishedPosts(), getAllTags()]);
  } catch {
    // DB unavailable
  }

  const filtered = activeTag ? allPosts.filter((p) => p.tags.includes(activeTag)) : allPosts;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-sm font-bold uppercase tracking-widest text-gray-500">
          {tr("blog.heading")}
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
            {tr("blog.all")}
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

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-600">{tr("blog.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="glass rounded-xl card-hover group overflow-hidden flex"
            >
              <div className="w-28 sm:w-36 shrink-0 bg-white/[0.03] border-r border-white/[0.05]">
                {post.featuredImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.featuredImage}
                    alt=""
                    className="w-full h-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square" aria-hidden />
                )}
              </div>
              <div className="flex-1 min-w-0 p-5 flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h2 className="font-bold text-sm text-white">{post.title}</h2>
                  <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider shrink-0">
                    {fmtDate(post.date)}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <TagBadge key={tag} tag={tag} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-600 font-bold uppercase tracking-wider group-hover:text-gray-400 transition-colors shrink-0">
                    {post.readingTime} {tr("blog.readMin")}
                    <ChevronRight className="w-3 h-3" />
                  </div>
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

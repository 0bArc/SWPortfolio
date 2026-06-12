import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import { listPublishedPosts, getAllTags } from "@/features/blog/services/posts";
import { translations, get } from "@/lib/i18n";
import TagBadge from "@/features/blog/components/TagBadge";
import BlogAuthorChip from "@/features/blog/components/BlogAuthorChip";
import PostAuthorBadge from "@/features/blog/components/PostAuthorBadge";
import { getPostAuthorDisplayBadges } from "@/features/blog/services/post-authors";
import BlogFilterBar from "@/features/blog/components/BlogFilterBar";
import BlogPagination from "@/features/blog/components/BlogPagination";
import {
  authorKey,
  buildAuthorsFromPosts,
  POSTS_PAGE_SIZE,
} from "@/features/blog/utils/authors";
import { enrichAuthorsWithIcons } from "@/features/blog/utils/authors.server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Posts – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
};

interface Props {
  searchParams: Promise<{ tag?: string; author?: string; page?: string }>;
}

async function PostList({ searchParams }: Props) {
  const { tag: activeTag, author: activeAuthor, page: pageRaw } = await searchParams;
  const tr = (path: string) => get(translations, path);
  const dateLocale = translations.dateLocale;

  let allPosts: Awaited<ReturnType<typeof listPublishedPosts>> = [];
  let allTags: string[] = [];
  try {
    [allPosts, allTags] = await Promise.all([listPublishedPosts(), getAllTags()]);
  } catch {
    // DB unavailable
  }

  let authors = buildAuthorsFromPosts(allPosts);
  try {
    authors = await enrichAuthorsWithIcons(authors);
  } catch {
    // icon lookup optional
  }

  const authorIcons = new Map(authors.map((a) => [a.key, a.icon]));

  let filtered = allPosts;
  if (activeAuthor) filtered = filtered.filter((p) => authorKey(p) === activeAuthor);
  if (activeTag) filtered = filtered.filter((p) => p.tags.includes(activeTag));

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PAGE_SIZE));
  const postsPage = Math.min(Math.max(1, parseInt(pageRaw ?? "1", 10) || 1), totalPages);
  const pagedPosts = filtered.slice(
    (postsPage - 1) * POSTS_PAGE_SIZE,
    postsPage * POSTS_PAGE_SIZE
  );

  const authorBadges = await getPostAuthorDisplayBadges(
    pagedPosts.map((p) => p.accountId).filter((id): id is number => id != null)
  );

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

      {(authors.length > 0 || allTags.length > 0) && (
        <BlogFilterBar
          authors={authors}
          tags={allTags}
          activeAuthor={activeAuthor}
          activeTag={activeTag}
          labels={{
            everyone: tr("blog.allAuthors"),
            allTags: tr("blog.all"),
          }}
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-600">{tr("blog.empty")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {pagedPosts.map((post) => {
              const key = authorKey(post);
              const icon = authorIcons.get(key) ?? post.authorIcon ?? null;
              const authorBadge = post.accountId ? authorBadges.get(post.accountId) ?? null : null;
              return (
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
                    <div className="flex items-center justify-between mt-auto gap-3 flex-wrap">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <BlogAuthorChip
                          name={post.author}
                          username={post.authorUsername}
                          icon={icon}
                          compact
                          static
                        />
                        {authorBadge && <PostAuthorBadge badge={authorBadge} inLink />}
                        {post.tags.length > 0 && (
                          <span className="text-gray-700 hidden sm:inline" aria-hidden>
                            ·
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <TagBadge key={tag} tag={tag} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-600 font-bold uppercase tracking-wider group-hover:text-gray-400 transition-colors shrink-0">
                        {post.readingTime} {tr("blog.readMin")}
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <BlogPagination
            page={postsPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            tag={activeTag}
            author={activeAuthor}
            labels={{
              prev: tr("blog.pagePrev"),
              next: tr("blog.pageNext"),
              page: tr("blog.pageOf"),
            }}
          />
        </>
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

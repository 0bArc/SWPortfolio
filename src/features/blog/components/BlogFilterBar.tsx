import Link from "next/link";
import BlogAuthorSelect from "@/features/blog/components/BlogAuthorSelect";
import { blogListHref, type BlogAuthor } from "@/features/blog/utils/authors";

interface Props {
  authors: BlogAuthor[];
  tags: string[];
  activeAuthor?: string;
  activeTag?: string;
  labels: {
    everyone: string;
    allTags: string;
  };
}

const tagClass = (active: boolean) =>
  `px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
    active
      ? "bg-white/10 text-white border-white/20"
      : "text-gray-300 border-transparent hover:text-white hover:bg-white/[0.05] hover:border-white/10"
  }`;

export default function BlogFilterBar({
  authors,
  tags,
  activeAuthor,
  activeTag,
  labels,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8">
      {authors.length > 0 && (
        <BlogAuthorSelect
          authors={authors}
          activeAuthor={activeAuthor}
          activeTag={activeTag}
          everyoneLabel={labels.everyone}
        />
      )}

      {tags.length > 0 && (
        <>
          {authors.length > 0 && (
            <span className="hidden sm:block w-px h-6 bg-white/[0.08] shrink-0" aria-hidden />
          )}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <Link
              href={blogListHref({ author: activeAuthor })}
              className={tagClass(!activeTag)}
            >
              {labels.allTags}
            </Link>
            {tags.map((tag) => (
              <Link
                key={tag}
                href={blogListHref({ tag, author: activeAuthor })}
                className={tagClass(activeTag === tag)}
              >
                #{tag}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

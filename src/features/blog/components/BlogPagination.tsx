import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { blogListHref } from "@/features/blog/utils/authors";

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  tag?: string;
  author?: string;
  labels: {
    prev: string;
    next: string;
    page: string;
  };
}

export default function BlogPagination({
  page,
  totalPages,
  totalItems,
  tag,
  author,
  labels,
}: Props) {
  if (totalItems === 0) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-4 mt-10 pt-6 border-t border-white/[0.08]"
      aria-label="Posts pagination"
    >
      <p className="text-[11px] text-gray-500 tabular-nums">
        {labels.page.replace("{current}", String(page)).replace("{total}", String(totalPages))}
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={page > 1 ? blogListHref({ page: page - 1, tag, author }) : undefined}
          disabled={page <= 1}
          aria-label={labels.prev}
        >
          <ChevronLeft className="w-4 h-4" />
        </PageLink>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1.5 text-gray-600 text-xs">
              …
            </span>
          ) : (
            <PageLink
              key={p}
              href={blogListHref({ page: p, tag, author })}
              active={p === page}
            >
              {p}
            </PageLink>
          )
        )}

        <PageLink
          href={page < totalPages ? blogListHref({ page: page + 1, tag, author }) : undefined}
          disabled={page >= totalPages}
          aria-label={labels.next}
        >
          <ChevronRight className="w-4 h-4" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  active,
  disabled,
  children,
  ...rest
}: {
  href?: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const className = `inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-colors ${
    active
      ? "bg-white/10 text-white border border-white/15"
      : disabled
        ? "text-gray-700 cursor-not-allowed"
        : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
  }`;

  if (!href || disabled) {
    return (
      <span className={className} {...rest}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

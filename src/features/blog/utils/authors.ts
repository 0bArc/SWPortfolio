export interface BlogAuthor {
  key: string;
  name: string;
  username: string | null;
  icon: string | null;
  count: number;
}

export interface AuthorPostSource {
  author: string;
  authorUsername?: string | null;
  authorIcon?: string | null;
}

export const POSTS_PAGE_SIZE = 10;

export function slugifyAuthor(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "author"
  );
}

export function authorKey(post: Pick<AuthorPostSource, "author" | "authorUsername">): string {
  return post.authorUsername ?? slugifyAuthor(post.author);
}

export function buildAuthorsFromPosts(posts: AuthorPostSource[]): BlogAuthor[] {
  const map = new Map<string, BlogAuthor>();

  for (const post of posts) {
    const key = authorKey(post);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.icon && post.authorIcon) existing.icon = post.authorIcon;
      continue;
    }
    map.set(key, {
      key,
      name: post.author,
      username: post.authorUsername ?? null,
      icon: post.authorIcon ?? null,
      count: 1,
    });
  }

  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function blogListHref(filters: {
  tag?: string;
  author?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.author) params.set("author", filters.author);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

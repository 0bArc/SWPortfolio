import { lookupAccountIcons } from "@/features/blog/services/posts";
import type { BlogAuthor } from "@/features/blog/utils/authors";

export async function enrichAuthorsWithIcons(authors: BlogAuthor[]): Promise<BlogAuthor[]> {
  const missing = authors.filter((a) => !a.icon);
  if (missing.length === 0) return authors;

  const iconMap = await lookupAccountIcons(
    missing.map((a) => a.username).filter(Boolean) as string[],
    missing.map((a) => a.name)
  );

  return authors.map((author) => {
    if (author.icon) return author;
    const fromUser = author.username ? iconMap.get(`user:${author.username}`) : undefined;
    const fromName = iconMap.get(`name:${author.name.toLowerCase()}`);
    return { ...author, icon: fromUser ?? fromName ?? null };
  });
}

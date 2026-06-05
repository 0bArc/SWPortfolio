export interface PostMeta {
  slug: string;
  title: string;
  date: string;        // ISO yyyy-mm-dd
  excerpt: string;
  tags: string[];
  readingTime: number; // minutes
}

export const posts: PostMeta[] = [
  {
    slug: "hei-verden",
    title: "Hei, verden",
    date: "2026-06-05",
    excerpt: "Første innlegg på bloggen min. Litt om hva jeg planlegger å skrive om fremover.",
    tags: ["meta"],
    readingTime: 1,
  },
];

export function getSortedPosts(): PostMeta[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): PostMeta | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllTags(): string[] {
  return [...new Set(posts.flatMap((p) => p.tags))].sort();
}

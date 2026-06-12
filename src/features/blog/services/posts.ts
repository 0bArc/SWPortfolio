import { getPoolReady } from "@/database";
import { resolveWorkingIconUrl } from "@/features/media/services/assets";

export interface PostMeta {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string | null;
  tags: string[];
  author: string;
  accountId: number | null;
  authorUsername?: string | null;
  authorIcon?: string | null;
  status: "draft" | "published";
  date: string;
  readingTime: number;
  created_at: string;
  updated_at: string;
}

export interface Post extends PostMeta {
  content: string;
}

function calcReadingTime(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

const META_COLS = `
  id, slug, title, excerpt, featured_image AS "featuredImage",
  tags, author, account_id AS "accountId", status,
  date::text, reading_time AS "readingTime",
  created_at::text, updated_at::text
`;

const ALL_COLS = `
  id, slug, title, excerpt, featured_image AS "featuredImage", content,
  tags, author, account_id AS "accountId", status,
  date::text, reading_time AS "readingTime",
  created_at::text, updated_at::text
`;

const PUBLISHED_JOIN = `
  FROM posts p
  LEFT JOIN accounts a ON a.id = p.account_id
`;

const PUBLISHED_META_COLS = `
  p.id, p.slug, p.title, p.excerpt, p.featured_image AS "featuredImage",
  p.tags, p.author, p.account_id AS "accountId",
  a.username AS "authorUsername", a.icon AS "authorIcon",
  p.status, p.date::text, p.reading_time AS "readingTime",
  p.created_at::text, p.updated_at::text
`;

export async function listPosts(): Promise<PostMeta[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<PostMeta>(
    `SELECT ${META_COLS} FROM posts ORDER BY date DESC, created_at DESC`
  );
  return rows;
}

export async function listPostsByAccount(accountId: number): Promise<PostMeta[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<PostMeta>(
    `SELECT ${META_COLS} FROM posts WHERE account_id = $1 ORDER BY date DESC, created_at DESC`,
    [accountId]
  );
  return rows;
}

export async function listPublishedPosts(): Promise<PostMeta[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<PostMeta>(
    `SELECT ${PUBLISHED_META_COLS} ${PUBLISHED_JOIN}
     WHERE p.status = 'published'
     ORDER BY p.date DESC, p.created_at DESC`
  );
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      authorIcon: await resolveWorkingIconUrl(row.authorIcon, row.accountId),
    }))
  );
}

export async function getPost(slug: string): Promise<Post | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<Post>(
    `SELECT ${ALL_COLS} FROM posts WHERE slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function getPublishedPost(slug: string): Promise<Post | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<Post>(
    `SELECT ${PUBLISHED_META_COLS}, p.content
     ${PUBLISHED_JOIN}
     WHERE p.slug = $1 AND p.status = 'published'`,
    [slug]
  );
  const post = rows[0];
  if (!post) return null;
  return {
    ...post,
    authorIcon: await resolveWorkingIconUrl(post.authorIcon, post.accountId),
  };
}

export async function getAllTags(): Promise<string[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ tag: string }>(
    `SELECT DISTINCT unnest(tags) AS tag FROM posts WHERE status = 'published' ORDER BY tag`
  );
  return rows.map((r) => r.tag);
}

export async function lookupAccountIcons(
  usernames: string[],
  displayNames: string[]
): Promise<Map<string, string>> {
  const icons = new Map<string, string>();
  if (usernames.length === 0 && displayNames.length === 0) return icons;

  const pool = await getPoolReady();
  const { rows } = await pool.query<{
    id: number;
    username: string;
    display_name: string;
    icon: string | null;
  }>(
    `SELECT id, username, display_name, icon FROM accounts
     WHERE username = ANY($1::text[]) OR LOWER(display_name) = ANY($2::text[])`,
    [usernames, displayNames.map((n) => n.toLowerCase())]
  );

  for (const row of rows) {
    const icon = await resolveWorkingIconUrl(row.icon, row.id);
    if (!icon) continue;
    icons.set(`user:${row.username}`, icon);
    icons.set(`name:${row.display_name.toLowerCase()}`, icon);
  }
  return icons;
}

export interface CreatePostInput {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage?: string | null;
  tags: string[];
  author: string;
  accountId?: number | null;
  status: "draft" | "published";
  date: string;
}

export async function createPost(data: CreatePostInput): Promise<Post> {
  const rt = calcReadingTime(data.content);
  const pool = await getPoolReady();
  const { rows } = await pool.query<Post>(
    `INSERT INTO posts (slug, title, excerpt, content, featured_image, tags, author, account_id, status, date, reading_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${ALL_COLS}`,
    [
      data.slug, data.title, data.excerpt, data.content,
      data.featuredImage ?? null, data.tags, data.author, data.accountId ?? null,
      data.status, data.date, rt,
    ]
  );
  return rows[0];
}

export function postOwnedByAccount(post: PostMeta, accountId: number): boolean {
  return post.accountId === accountId;
}

export interface UpdatePostInput {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string | null;
  tags?: string[];
  author?: string;
  accountId?: number | null;
  status?: "draft" | "published";
  date?: string;
}

export async function updatePost(slug: string, data: UpdatePostInput): Promise<Post | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.title   !== undefined) { fields.push(`title = $${idx++}`);   values.push(data.title); }
  if (data.excerpt !== undefined) { fields.push(`excerpt = $${idx++}`); values.push(data.excerpt); }
  if (data.featuredImage !== undefined) {
    fields.push(`featured_image = $${idx++}`);
    values.push(data.featuredImage);
  }
  if (data.content !== undefined) {
    fields.push(`content = $${idx++}`);      values.push(data.content);
    fields.push(`reading_time = $${idx++}`); values.push(calcReadingTime(data.content));
  }
  if (data.tags    !== undefined) { fields.push(`tags = $${idx++}`);    values.push(data.tags); }
  if (data.author  !== undefined) { fields.push(`author = $${idx++}`);  values.push(data.author); }
  if (data.accountId !== undefined) { fields.push(`account_id = $${idx++}`); values.push(data.accountId); }
  if (data.status  !== undefined) { fields.push(`status = $${idx++}`);  values.push(data.status); }
  if (data.date    !== undefined) { fields.push(`date = $${idx++}`);    values.push(data.date); }
  if (data.slug    !== undefined) { fields.push(`slug = $${idx++}`);    values.push(data.slug); }

  if (fields.length === 0) return getPost(slug);

  fields.push(`updated_at = NOW()`);
  values.push(slug);

  const pool = await getPoolReady();
  const { rows } = await pool.query<Post>(
    `UPDATE posts SET ${fields.join(", ")} WHERE slug = $${idx} RETURNING ${ALL_COLS}`,
    values
  );
  return rows[0] ?? null;
}

export async function deletePost(slug: string): Promise<boolean> {
  const pool = await getPoolReady();
  await pool.query("DELETE FROM post_comments WHERE post_slug = $1", [slug]);
  const { rowCount } = await pool.query("DELETE FROM posts WHERE slug = $1", [slug]);
  return (rowCount ?? 0) > 0;
}

import { getPool } from "@/database";

export interface PostMeta {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string | null;
  tags: string[];
  author: string;
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
  tags, author, status,
  date::text, reading_time AS "readingTime",
  created_at::text, updated_at::text
`;

const ALL_COLS = `
  id, slug, title, excerpt, featured_image AS "featuredImage", content,
  tags, author, status,
  date::text, reading_time AS "readingTime",
  created_at::text, updated_at::text
`;

export async function listPosts(): Promise<PostMeta[]> {
  const { rows } = await getPool().query<PostMeta>(
    `SELECT ${META_COLS} FROM posts ORDER BY date DESC, created_at DESC`
  );
  return rows;
}

export async function listPublishedPosts(): Promise<PostMeta[]> {
  const { rows } = await getPool().query<PostMeta>(
    `SELECT ${META_COLS} FROM posts WHERE status = 'published' ORDER BY date DESC, created_at DESC`
  );
  return rows;
}

export async function getPost(slug: string): Promise<Post | null> {
  const { rows } = await getPool().query<Post>(
    `SELECT ${ALL_COLS} FROM posts WHERE slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function getPublishedPost(slug: string): Promise<Post | null> {
  const { rows } = await getPool().query<Post>(
    `SELECT ${ALL_COLS} FROM posts WHERE slug = $1 AND status = 'published'`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function getAllTags(): Promise<string[]> {
  const { rows } = await getPool().query<{ tag: string }>(
    `SELECT DISTINCT unnest(tags) AS tag FROM posts WHERE status = 'published' ORDER BY tag`
  );
  return rows.map((r) => r.tag);
}

export interface CreatePostInput {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage?: string | null;
  tags: string[];
  author: string;
  status: "draft" | "published";
  date: string;
}

export async function createPost(data: CreatePostInput): Promise<Post> {
  const rt = calcReadingTime(data.content);
  const { rows } = await getPool().query<Post>(
    `INSERT INTO posts (slug, title, excerpt, content, featured_image, tags, author, status, date, reading_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${ALL_COLS}`,
    [
      data.slug, data.title, data.excerpt, data.content,
      data.featuredImage ?? null, data.tags, data.author, data.status, data.date, rt,
    ]
  );
  return rows[0];
}

export interface UpdatePostInput {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string | null;
  tags?: string[];
  author?: string;
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
  if (data.status  !== undefined) { fields.push(`status = $${idx++}`);  values.push(data.status); }
  if (data.date    !== undefined) { fields.push(`date = $${idx++}`);    values.push(data.date); }
  if (data.slug    !== undefined) { fields.push(`slug = $${idx++}`);    values.push(data.slug); }

  if (fields.length === 0) return getPost(slug);

  fields.push(`updated_at = NOW()`);
  values.push(slug);

  const { rows } = await getPool().query<Post>(
    `UPDATE posts SET ${fields.join(", ")} WHERE slug = $${idx} RETURNING ${ALL_COLS}`,
    values
  );
  return rows[0] ?? null;
}

export async function deletePost(slug: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    "DELETE FROM posts WHERE slug = $1",
    [slug]
  );
  return (rowCount ?? 0) > 0;
}

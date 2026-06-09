import { getPoolReady } from "@/database";
import { POST_COMMENTS_TABLE, type PostCommentRow } from "@/database/schema";

export type CommentView = {
  id: number;
  postSlug: string;
  parentId: number | null;
  content: string;
  createdAt: string;
  author: {
    username: string;
    displayName: string;
    icon: string | null;
  };
  replies: CommentView[];
};

const SELECT_COMMENT = `
  SELECT c.id, c.post_slug, c.account_id, c.parent_id, c.content, c.created_at,
         a.username, a.display_name, a.icon
`;

function toFlat(row: PostCommentRow): Omit<CommentView, "replies"> {
  return {
    id: row.id,
    postSlug: row.post_slug,
    parentId: row.parent_id ?? null,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    author: {
      username: row.username,
      displayName: row.display_name,
      icon: row.icon,
    },
  };
}

export function buildCommentTree(rows: PostCommentRow[]): CommentView[] {
  const flat = rows.map(toFlat);
  const byId = new Map(flat.map((c) => [c.id, { ...c, replies: [] as CommentView[] }]));
  const roots: CommentView[] = [];

  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.replies.push(c);
    } else {
      roots.push(c);
    }
  }

  return roots;
}

export async function listCommentsForPost(postSlug: string): Promise<CommentView[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<PostCommentRow>(
    `${SELECT_COMMENT}
     FROM ${POST_COMMENTS_TABLE} c
     JOIN accounts a ON a.id = c.account_id
     WHERE c.post_slug = $1
     ORDER BY c.created_at ASC`,
    [postSlug]
  );
  return buildCommentTree(rows);
}

export async function getCommentById(
  commentId: number,
  postSlug: string
): Promise<PostCommentRow | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<PostCommentRow>(
    `${SELECT_COMMENT}
     FROM ${POST_COMMENTS_TABLE} c
     JOIN accounts a ON a.id = c.account_id
     WHERE c.id = $1 AND c.post_slug = $2`,
    [commentId, postSlug]
  );
  return rows[0] ?? null;
}

export async function createComment(input: {
  postSlug: string;
  accountId: number;
  content: string;
  parentId?: number | null;
}): Promise<CommentView> {
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await getCommentById(parentId, input.postSlug);
    if (!parent) throw new Error("Parent comment not found");
  }

  const pool = await getPoolReady();
  const { rows } = await pool.query<PostCommentRow>(
    `WITH inserted AS (
       INSERT INTO ${POST_COMMENTS_TABLE} (post_slug, account_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, post_slug, account_id, parent_id, content, created_at
     )
     SELECT i.id, i.post_slug, i.account_id, i.parent_id, i.content, i.created_at,
            a.username, a.display_name, a.icon
     FROM inserted i
     JOIN accounts a ON a.id = i.account_id`,
    [input.postSlug, input.accountId, input.content, parentId]
  );
  const flat = toFlat(rows[0]);
  return { ...flat, replies: [] };
}

export type CommentHistoryItem = {
  id: number;
  postSlug: string;
  postTitle: string;
  content: string;
  createdAt: string;
};

export async function deleteComment(commentId: number): Promise<string | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ post_slug: string }>(
    `DELETE FROM ${POST_COMMENTS_TABLE} WHERE id = $1 RETURNING post_slug`,
    [commentId]
  );
  return rows[0]?.post_slug ?? null;
}

export async function listCommentsForAccount(accountId: number): Promise<CommentHistoryItem[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{
    id: number;
    post_slug: string;
    post_title: string | null;
    content: string;
    created_at: Date;
  }>(
    `SELECT c.id, c.post_slug, p.title AS post_title, c.content, c.created_at
     FROM ${POST_COMMENTS_TABLE} c
     LEFT JOIN posts p ON p.slug = c.post_slug
     WHERE c.account_id = $1
     ORDER BY c.created_at DESC
     LIMIT 50`,
    [accountId]
  );
  return rows.map((r) => ({
    id: r.id,
    postSlug: r.post_slug,
    postTitle: r.post_title ?? r.post_slug,
    content: r.content,
    createdAt: r.created_at.toISOString(),
  }));
}

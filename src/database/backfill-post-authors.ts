import type { Pool } from "pg";
import { POST_AUTHOR_BADGE_SLUGS } from "@/features/blog/services/post-authors";

/**
 * Link legacy posts (account_id NULL) to accounts when author text matches
 * display_name or username and the account can be a post author.
 * Idempotent — safe on every deploy / server start.
 */
export async function backfillPostAuthors(pool: Pool): Promise<number> {
  if (POST_AUTHOR_BADGE_SLUGS.length === 0) return 0;

  const { rowCount } = await pool.query(
    `UPDATE posts p
     SET account_id = matched.account_id, updated_at = NOW()
     FROM (
       SELECT DISTINCT ON (p2.id) p2.id AS post_id, a.id AS account_id
       FROM posts p2
       INNER JOIN accounts a ON a.banned_at IS NULL
         AND (
           LOWER(TRIM(p2.author)) = LOWER(TRIM(a.display_name))
           OR LOWER(TRIM(p2.author)) = LOWER(TRIM(a.username))
         )
       INNER JOIN account_badges b ON b.account_id = a.id AND b.slug = ANY($1::text[])
       WHERE p2.account_id IS NULL
       ORDER BY p2.id, a.id
     ) matched
     WHERE p.id = matched.post_id AND p.account_id IS NULL`,
    [POST_AUTHOR_BADGE_SLUGS]
  );

  return rowCount ?? 0;
}

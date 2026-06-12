import { getPoolReady } from "@/database";
import { publishAccountEvent } from "@/lib/network/server/events";
import {
  NOTIFICATIONS_TABLE,
  NOTIFICATION_SUPPRESSIONS_TABLE,
  type NotificationRow,
} from "@/database/schema";

export type NotificationView = {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  postSlug: string | null;
  commentId: number | null;
  href: string;
  actor: {
    username: string;
    displayName: string;
    icon: string | null;
  } | null;
};

function notificationHref(type: string, postSlug: string | null): string {
  if (
    (type === "icon_approved" || type === "icon_rejected") &&
    postSlug
  ) {
    return `/u/${postSlug}`;
  }
  if (postSlug) return `/blog/${postSlug}`;
  return "/blog";
}

function toView(row: NotificationRow): NotificationView {
  const postSlug = row.post_slug;
  const href = notificationHref(row.type, postSlug);
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    read: row.read_at != null,
    createdAt: row.created_at.toISOString(),
    postSlug,
    commentId: row.comment_id,
    href,
    actor: row.actor_username
      ? {
          username: row.actor_username,
          displayName: row.actor_display_name ?? row.actor_username,
          icon: row.actor_icon,
        }
      : null,
  };
}

const SELECT_NOTIFICATION = `
  SELECT n.id, n.account_id, n.actor_account_id, n.type, n.post_slug, n.comment_id,
         n.message, n.read_at, n.created_at,
         a.username AS actor_username, a.display_name AS actor_display_name, a.icon AS actor_icon
  FROM ${NOTIFICATIONS_TABLE} n
  LEFT JOIN accounts a ON a.id = n.actor_account_id
`;

export async function isNotificationSuppressed(
  recipientId: number,
  actorId: number
): Promise<boolean> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM ${NOTIFICATION_SUPPRESSIONS_TABLE}
       WHERE account_id = $1 AND suppressed_account_id = $2
     ) AS exists`,
    [recipientId, actorId]
  );
  return rows[0]?.exists === true;
}

export async function createNotification(input: {
  accountId: number;
  actorAccountId: number | null;
  type: string;
  postSlug?: string | null;
  commentId?: number | null;
  message: string;
}): Promise<NotificationView | null> {
  if (input.actorAccountId && input.actorAccountId === input.accountId) return null;
  if (input.actorAccountId) {
    const suppressed = await isNotificationSuppressed(input.accountId, input.actorAccountId);
    if (suppressed) return null;
  }

  const pool = await getPoolReady();
  const { rows } = await pool.query<NotificationRow>(
    `WITH inserted AS (
       INSERT INTO ${NOTIFICATIONS_TABLE}
         (account_id, actor_account_id, type, post_slug, comment_id, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, account_id, actor_account_id, type, post_slug, comment_id, message, read_at, created_at
     )
     ${SELECT_NOTIFICATION.replace(
       `FROM ${NOTIFICATIONS_TABLE} n`,
       "FROM inserted n"
     )}`,
    [
      input.accountId,
      input.actorAccountId,
      input.type,
      input.postSlug ?? null,
      input.commentId ?? null,
      input.message,
    ]
  );

  const view = rows[0] ? toView(rows[0]) : null;
  if (view) {
    publishAccountEvent(input.accountId, {
      type: "refresh",
      channel: "notifications",
      data: { id: view.id },
    });
  }
  return view;
}

export async function listNotificationsForAccount(
  accountId: number,
  limit = 40
): Promise<NotificationView[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<NotificationRow>(
    `${SELECT_NOTIFICATION}
     WHERE n.account_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [accountId, limit]
  );
  return rows.map(toView);
}

export async function countUnreadNotifications(accountId: number): Promise<number> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${NOTIFICATIONS_TABLE}
     WHERE account_id = $1 AND read_at IS NULL`,
    [accountId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function markNotificationsRead(
  accountId: number,
  ids?: number[]
): Promise<void> {
  const pool = await getPoolReady();
  if (ids && ids.length > 0) {
    await pool.query(
      `UPDATE ${NOTIFICATIONS_TABLE} SET read_at = NOW()
       WHERE account_id = $1 AND id = ANY($2::int[]) AND read_at IS NULL`,
      [accountId, ids]
    );
    return;
  }
  await pool.query(
    `UPDATE ${NOTIFICATIONS_TABLE} SET read_at = NOW()
     WHERE account_id = $1 AND read_at IS NULL`,
    [accountId]
  );
}

export async function suppressNotificationsFrom(
  accountId: number,
  suppressedAccountId: number
): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `INSERT INTO ${NOTIFICATION_SUPPRESSIONS_TABLE} (account_id, suppressed_account_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [accountId, suppressedAccountId]
  );
}

export async function unsuppressNotificationsFrom(
  accountId: number,
  suppressedAccountId: number
): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `DELETE FROM ${NOTIFICATION_SUPPRESSIONS_TABLE}
     WHERE account_id = $1 AND suppressed_account_id = $2`,
    [accountId, suppressedAccountId]
  );
}

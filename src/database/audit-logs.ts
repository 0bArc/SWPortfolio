import { getPoolReady } from "@/database";
import type { AuditCategory } from "@/features/events/types";

export const AUDIT_LOGS_TABLE = "audit_logs";

export type AuditLogRow = {
  id: number;
  event_type: string;
  category: AuditCategory;
  actor_account_id: number | null;
  target_account_id: number | null;
  target_resource_type: string | null;
  target_resource_id: string | null;
  summary: string;
  meta: Record<string, unknown>;
  created_at: Date;
  actor_username: string | null;
  actor_display_name: string | null;
  target_username: string | null;
  target_display_name: string | null;
};

export type AuditLogView = {
  id: number;
  eventType: string;
  category: AuditCategory;
  summary: string;
  meta: Record<string, unknown>;
  createdAt: string;
  actor: { username: string; displayName: string } | null;
  target: { username: string; displayName: string } | null;
  targetResourceType: string | null;
  targetResourceId: string | null;
};

const SELECT_AUDIT = `
  SELECT l.id, l.event_type, l.category, l.actor_account_id, l.target_account_id,
         l.target_resource_type, l.target_resource_id, l.summary, l.meta, l.created_at,
         aa.username AS actor_username, aa.display_name AS actor_display_name,
         ta.username AS target_username, ta.display_name AS target_display_name
  FROM ${AUDIT_LOGS_TABLE} l
  LEFT JOIN accounts aa ON aa.id = l.actor_account_id
  LEFT JOIN accounts ta ON ta.id = l.target_account_id
`;

function toView(row: AuditLogRow): AuditLogView {
  return {
    id: row.id,
    eventType: row.event_type,
    category: row.category,
    summary: row.summary,
    meta: row.meta ?? {},
    createdAt: row.created_at.toISOString(),
    actor: row.actor_username
      ? { username: row.actor_username, displayName: row.actor_display_name ?? row.actor_username }
      : null,
    target: row.target_username
      ? { username: row.target_username, displayName: row.target_display_name ?? row.target_username }
      : null,
    targetResourceType: row.target_resource_type,
    targetResourceId: row.target_resource_id,
  };
}

export async function createAuditLog(input: {
  eventType: string;
  category: AuditCategory;
  actorAccountId?: number | null;
  targetAccountId?: number | null;
  targetResourceType?: string | null;
  targetResourceId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<AuditLogView> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<AuditLogRow>(
    `WITH inserted AS (
       INSERT INTO ${AUDIT_LOGS_TABLE}
         (event_type, category, actor_account_id, target_account_id,
          target_resource_type, target_resource_id, summary, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id, event_type, category, actor_account_id, target_account_id,
                 target_resource_type, target_resource_id, summary, meta, created_at
     )
     ${SELECT_AUDIT.replace(`FROM ${AUDIT_LOGS_TABLE} l`, "FROM inserted l")}`,
    [
      input.eventType,
      input.category,
      input.actorAccountId ?? null,
      input.targetAccountId ?? null,
      input.targetResourceType ?? null,
      input.targetResourceId ?? null,
      input.summary,
      JSON.stringify(input.meta ?? {}),
    ]
  );
  return toView(rows[0]!);
}

export const AUDIT_PAGE_SIZE = 50;

export async function listAuditLogs(
  page = 1,
  filters?: { category?: AuditCategory; eventType?: string }
): Promise<{ items: AuditLogView[]; total: number; page: number; pageSize: number }> {
  const pool = await getPoolReady();
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * AUDIT_PAGE_SIZE;
  const params: unknown[] = [];
  const where: string[] = [];

  if (filters?.category) {
    params.push(filters.category);
    where.push(`l.category = $${params.length}`);
  }
  if (filters?.eventType) {
    params.push(filters.eventType);
    where.push(`l.event_type = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${AUDIT_LOGS_TABLE} l ${whereSql}`,
    params
  );
  const total = Number(countRes.rows[0]?.count ?? 0);

  const listParams = [...params, AUDIT_PAGE_SIZE, offset];
  const { rows } = await pool.query<AuditLogRow>(
    `${SELECT_AUDIT}
     ${whereSql}
     ORDER BY l.created_at DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    items: rows.map(toView),
    total,
    page: safePage,
    pageSize: AUDIT_PAGE_SIZE,
  };
}

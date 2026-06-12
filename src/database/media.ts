import { getPool } from "@/database";

export type MediaKind = "avatar" | "blog";
export type MediaStatus = "pending" | "approved" | "rejected" | "superseded";

export type MediaAsset = {
  id: string;
  accountId: number | null;
  uploadedByAccountId: number | null;
  kind: MediaKind;
  status: MediaStatus;
  fileSize: number | null;
  createdAt: string;
  approvedAt: string | null;
  approvedByAccountId: number | null;
  username: string | null;
  displayName: string | null;
};

export const MEDIA_PAGE_SIZE = 24;

export async function insertMediaAsset(input: {
  id: string;
  accountId?: number | null;
  uploadedByAccountId?: number | null;
  kind: MediaKind;
  status: MediaStatus;
  fileSize?: number | null;
  approvedByAccountId?: number | null;
  contentHash?: string | null;
}): Promise<void> {
  const pool = await getPool();
  const approvedAt = input.status === "approved" ? new Date() : null;
  await pool.query(
    `INSERT INTO media_assets (
      id, account_id, uploaded_by_account_id, kind, status, file_size, approved_at, approved_by_account_id, content_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.id,
      input.accountId ?? null,
      input.uploadedByAccountId ?? null,
      input.kind,
      input.status,
      input.fileSize ?? null,
      approvedAt,
      input.approvedByAccountId ?? null,
      input.contentHash ?? null,
    ]
  );
}

export async function findMediaAssetIdByContentHash(hash: string): Promise<string | null> {
  const pool = await getPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM media_assets WHERE content_hash = $1 LIMIT 1`,
    [hash]
  );
  return rows[0]?.id ?? null;
}

export async function updateMediaStatus(
  id: string,
  status: MediaStatus,
  approvedByAccountId?: number | null
): Promise<void> {
  const pool = await getPool();
  await pool.query(
    `UPDATE media_assets
     SET status = $2,
         approved_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE approved_at END,
         approved_by_account_id = COALESCE($3, approved_by_account_id)
     WHERE id = $1`,
    [id, status, approvedByAccountId ?? null]
  );
}

export async function supersedeAccountMedia(
  accountId: number,
  kind: MediaKind,
  exceptId?: string
): Promise<string[]> {
  const pool = await getPool();
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE media_assets
     SET status = 'superseded'
     WHERE account_id = $1 AND kind = $2 AND status IN ('pending', 'approved')
       AND ($3::text IS NULL OR id::text <> $3)
     RETURNING id`,
    [accountId, kind, exceptId ?? null]
  );
  return rows.map((r) => r.id);
}

export async function listMediaAssets(
  page: number,
  filters?: { kind?: MediaKind; status?: MediaStatus; accountId?: number }
): Promise<{ items: MediaAsset[]; total: number }> {
  const pool = await getPool();
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * MEDIA_PAGE_SIZE;
  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.kind) {
    clauses.push(`m.kind = $${idx++}`);
    params.push(filters.kind);
  }
  if (filters?.status) {
    clauses.push(`m.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.accountId) {
    clauses.push(`m.account_id = $${idx++}`);
    params.push(filters.accountId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM media_assets m ${where}`,
    params
  );

  const { rows } = await pool.query<{
    id: string;
    account_id: number | null;
    uploaded_by_account_id: number | null;
    kind: MediaKind;
    status: MediaStatus;
    file_size: number | null;
    created_at: Date;
    approved_at: Date | null;
    approved_by_account_id: number | null;
    username: string | null;
    display_name: string | null;
  }>(
    `SELECT m.id, m.account_id, m.uploaded_by_account_id, m.kind, m.status, m.file_size,
            m.created_at, m.approved_at, m.approved_by_account_id,
            a.username, a.display_name
     FROM media_assets m
     LEFT JOIN accounts a ON a.id = m.account_id
     ${where}
     ORDER BY m.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, MEDIA_PAGE_SIZE, offset]
  );

  return {
    total: Number(countRes.rows[0]?.count ?? 0),
    items: rows.map((r) => ({
      id: r.id,
      accountId: r.account_id,
      uploadedByAccountId: r.uploaded_by_account_id,
      kind: r.kind,
      status: r.status,
      fileSize: r.file_size,
      createdAt: r.created_at.toISOString(),
      approvedAt: r.approved_at?.toISOString() ?? null,
      approvedByAccountId: r.approved_by_account_id,
      username: r.username,
      displayName: r.display_name,
    })),
  };
}

export async function getMediaAssetById(id: string): Promise<MediaAsset | null> {
  const pool = await getPool();
  const { rows } = await pool.query<{
    id: string;
    account_id: number | null;
    uploaded_by_account_id: number | null;
    kind: MediaKind;
    status: MediaStatus;
    file_size: number | null;
    created_at: Date;
    approved_at: Date | null;
    approved_by_account_id: number | null;
    username: string | null;
    display_name: string | null;
  }>(
    `SELECT m.id, m.account_id, m.uploaded_by_account_id, m.kind, m.status, m.file_size,
            m.created_at, m.approved_at, m.approved_by_account_id,
            a.username, a.display_name
     FROM media_assets m
     LEFT JOIN accounts a ON a.id = m.account_id
     WHERE m.id = $1`,
    [id]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    accountId: r.account_id,
    uploadedByAccountId: r.uploaded_by_account_id,
    kind: r.kind,
    status: r.status,
    fileSize: r.file_size,
    createdAt: r.created_at.toISOString(),
    approvedAt: r.approved_at?.toISOString() ?? null,
    approvedByAccountId: r.approved_by_account_id,
    username: r.username,
    displayName: r.display_name,
  };
}

export async function listApprovedAvatarIds(accountId: number): Promise<string[]> {
  const pool = await getPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM media_assets
     WHERE account_id = $1 AND kind = 'avatar' AND status = 'approved'
     ORDER BY created_at DESC`,
    [accountId]
  );
  return rows.map((r) => r.id);
}

export async function listAvatarIdsForAccount(accountId: number): Promise<string[]> {
  const pool = await getPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM media_assets
     WHERE account_id = $1 AND kind = 'avatar'
     ORDER BY CASE status
       WHEN 'approved' THEN 0
       WHEN 'pending' THEN 1
       WHEN 'superseded' THEN 2
       ELSE 3
     END, created_at DESC`,
    [accountId]
  );
  return rows.map((r) => r.id);
}

export async function deleteMediaAssetRow(id: string): Promise<boolean> {
  const pool = await getPool();
  const res = await pool.query(`DELETE FROM media_assets WHERE id = $1 RETURNING id`, [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function getMediaIdsByUrlRefs(
  accountId: number,
  urls: (string | null | undefined)[]
): Promise<string[]> {
  const ids = urls
    .map((u) => (u ? u.match(/\/api\/images\/([a-f0-9-]{36})/i)?.[1] : null))
    .filter((id): id is string => !!id);
  if (ids.length === 0) return [];
  const pool = await getPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM media_assets WHERE account_id = $1 AND id = ANY($2::uuid[])`,
    [accountId, ids]
  );
  return rows.map((r) => r.id);
}

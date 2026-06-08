import { createHash, randomBytes } from "node:crypto";
import { getPoolReady } from "@/lib/db";
import {
  ACCOUNTS_TABLE,
  ACCOUNT_TOKENS_TABLE,
  ACCOUNT_BRIDGES_TABLE,
  ACCOUNT_BADGES_TABLE,
  POST_COMMENTS_TABLE,
  ACCOUNT_SESSION_MAX_AGE,
  type AccountActivityEntry,
  type AccountPublic,
  type AccountRow,
  type AccountListItem,
  type AccountSettings,
} from "@/db/schema";
import type { BridgeProvider, BridgeTokens } from "@/lib/accounts/bridges";
import { applyBadgeLayout } from "@/lib/accounts/badge-display";
import { grantKeyFor, resolveFeaturedBadge } from "@/lib/accounts/badges";
import { mapBadges, syncBadgesForAccount } from "@/lib/accounts/badge-service";
import { parseAccountSettings, settingsToJson } from "@/lib/accounts/settings";
import { listCommentsForAccount, type CommentHistoryItem } from "@/lib/db/comments";
import type { AccountBadge } from "@/db/schema";

function rowToPublic(
  row: Pick<AccountRow, "username" | "display_name" | "icon" | "bio" | "created_at">
): AccountPublic {
  return {
    username: row.username,
    displayName: row.display_name,
    icon: row.icon,
    bio: row.bio ?? "",
    createdAt: row.created_at.toISOString(),
  };
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createAccount(input: {
  username: string;
  displayName: string;
  passwordHash: string;
  icon?: string | null;
  signupIp?: string | null;
}): Promise<AccountPublic> {
  const pool = await getPoolReady();
  const activity: AccountActivityEntry[] = [
    { type: "signup", at: new Date().toISOString(), ip: input.signupIp ?? null },
  ];
  const { rows } = await pool.query<AccountRow>(
    `INSERT INTO ${ACCOUNTS_TABLE}
       (username, display_name, icon, password_hash, signup_ip, last_ip, activity)
     VALUES ($1, $2, $3, $4, $5::inet, $5::inet, $6::jsonb)
     RETURNING username, display_name, icon, bio, created_at`,
    [
      input.username,
      input.displayName,
      input.icon ?? null,
      input.passwordHash,
      input.signupIp ?? null,
      JSON.stringify(activity),
    ]
  );
  return rowToPublic(rows[0]);
}

export async function getAccountByUsername(username: string): Promise<(AccountRow & { password_hash: string }) | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<AccountRow & { password_hash: string }>(
    `SELECT * FROM ${ACCOUNTS_TABLE} WHERE username = $1`,
    [username]
  );
  return rows[0] ?? null;
}

export async function getAccountIdByUsername(username: string): Promise<number | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM ${ACCOUNTS_TABLE} WHERE username = $1`,
    [username]
  );
  return rows[0]?.id ?? null;
}

export async function getPublicAccount(username: string): Promise<AccountPublic | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<Pick<AccountRow, "username" | "display_name" | "icon" | "bio" | "created_at">>(
    `SELECT username, display_name, icon, bio, created_at FROM ${ACCOUNTS_TABLE} WHERE username = $1`,
    [username]
  );
  return rows[0] ? rowToPublic(rows[0]) : null;
}

export async function getAccountSettings(accountId: number): Promise<AccountSettings> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ settings: unknown }>(
    `SELECT settings FROM ${ACCOUNTS_TABLE} WHERE id = $1`,
    [accountId]
  );
  return parseAccountSettings(rows[0]?.settings);
}

export async function updateAccountSettings(
  accountId: number,
  patch: Partial<AccountSettings>
): Promise<AccountSettings> {
  const current = await getAccountSettings(accountId);
  const next = { ...current, ...patch };
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET settings = $2::jsonb, updated_at = NOW() WHERE id = $1`,
    [accountId, JSON.stringify(settingsToJson(next))]
  );
  return next;
}

export async function isProfileVisible(username: string, viewerUsername?: string | null): Promise<boolean> {
  if (viewerUsername && viewerUsername === username) return true;
  const row = await getAccountByUsername(username);
  if (!row) return false;
  return parseAccountSettings(row.settings).profilePublic;
}

export async function updateAccountDisplayName(accountId: number, displayName: string): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET display_name = $2, updated_at = NOW() WHERE id = $1`,
    [accountId, displayName]
  );
}

export async function updateAccountBio(accountId: number, bio: string): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET bio = $2, updated_at = NOW() WHERE id = $1`,
    [accountId, bio]
  );
}

export async function updateAccountIcon(accountId: number, icon: string | null): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET icon = $2, updated_at = NOW() WHERE id = $1`,
    [accountId, icon]
  );
}

export async function deleteAccount(accountId: number): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(`DELETE FROM ${ACCOUNTS_TABLE} WHERE id = $1`, [accountId]);
}

/** Inserts badge per stack policy. Returns false if grant_key already held. */
export async function awardBadge(
  accountId: number,
  slug: string,
  grantedBy: number | null = null,
  at: Date = new Date()
): Promise<boolean> {
  const pool = await getPoolReady();
  const grantKey = grantKeyFor(slug, at);
  const { rowCount } = await pool.query(
    `INSERT INTO ${ACCOUNT_BADGES_TABLE} (account_id, slug, grant_key, granted_by, awarded_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (account_id, grant_key) DO NOTHING`,
    [accountId, slug, grantKey, grantedBy, at]
  );
  return (rowCount ?? 0) > 0;
}

/** Auto-sync — one grant per slug. */
export async function ensureBadge(accountId: number, slug: string): Promise<void> {
  await awardBadge(accountId, slug, null);
}

export async function distinctBadgeSlugs(accountId: number): Promise<string[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ slug: string }>(
    `SELECT DISTINCT slug FROM ${ACCOUNT_BADGES_TABLE} WHERE account_id = $1`,
    [accountId]
  );
  return rows.map((r) => r.slug);
}

export async function listBadgesForAccount(
  accountId: number
): Promise<{ slug: string; awarded_at: Date }[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ slug: string; awarded_at: Date }>(
    `SELECT slug, awarded_at FROM ${ACCOUNT_BADGES_TABLE}
     WHERE account_id = $1 ORDER BY awarded_at ASC`,
    [accountId]
  );
  return rows;
}

export async function revokeBadge(accountId: number, slug: string): Promise<boolean> {
  const pool = await getPoolReady();
  const { rowCount } = await pool.query(
    `DELETE FROM ${ACCOUNT_BADGES_TABLE} WHERE account_id = $1 AND slug = $2`,
    [accountId, slug]
  );
  return (rowCount ?? 0) > 0;
}

type AccountListRow = {
  id: number;
  username: string;
  display_name: string;
  icon: string | null;
  created_at: Date;
  settings: unknown;
  comment_count: string;
  badge_slugs: string[] | null;
};

function mapAccountListRow(row: AccountListRow): AccountListItem {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    icon: row.icon,
    createdAt: row.created_at.toISOString(),
    commentCount: Number(row.comment_count),
    badgeSlugs: row.badge_slugs ?? [],
    settings: parseAccountSettings(row.settings),
  };
}

export async function countAccounts(query?: string): Promise<number> {
  const pool = await getPoolReady();
  const q = query?.trim();
  if (q) {
    const pattern = `%${q}%`;
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${ACCOUNTS_TABLE}
       WHERE username ILIKE $1 OR display_name ILIKE $1`,
      [pattern]
    );
    return Number(rows[0]?.count ?? 0);
  }
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${ACCOUNTS_TABLE}`
  );
  return Number(rows[0]?.count ?? 0);
}

export async function listAccountsPaginated(
  page: number,
  pageSize: number,
  query?: string
): Promise<AccountListItem[]> {
  const pool = await getPoolReady();
  const offset = Math.max(0, (page - 1) * pageSize);
  const q = query?.trim();
  const base = `
    SELECT a.id, a.username, a.display_name, a.icon, a.created_at, a.settings,
      (SELECT COUNT(*)::text FROM ${POST_COMMENTS_TABLE} c WHERE c.account_id = a.id) AS comment_count,
      (SELECT COALESCE(array_agg(DISTINCT b.slug), '{}') FROM ${ACCOUNT_BADGES_TABLE} b WHERE b.account_id = a.id) AS badge_slugs
    FROM ${ACCOUNTS_TABLE} a`;

  const { rows } = q
    ? await pool.query<AccountListRow>(
        `${base} WHERE a.username ILIKE $1 OR a.display_name ILIKE $1 ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
        [`%${q}%`, pageSize, offset]
      )
    : await pool.query<AccountListRow>(
        `${base} ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      );

  return rows.map(mapAccountListRow);
}

export async function getAccountListItem(username: string): Promise<AccountListItem | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<AccountListRow>(
    `SELECT a.id, a.username, a.display_name, a.icon, a.created_at, a.settings,
      (SELECT COUNT(*)::text FROM ${POST_COMMENTS_TABLE} c WHERE c.account_id = a.id) AS comment_count,
      (SELECT COALESCE(array_agg(DISTINCT b.slug), '{}') FROM ${ACCOUNT_BADGES_TABLE} b WHERE b.account_id = a.id) AS badge_slugs
     FROM ${ACCOUNTS_TABLE} a WHERE a.username = $1`,
    [username]
  );
  return rows[0] ? mapAccountListRow(rows[0]) : null;
}

export type ProfileView = {
  account: AccountPublic;
  settings: AccountSettings;
  badges: AccountBadge[];
  featuredBadge: AccountBadge | null;
  history: CommentHistoryItem[];
  isOwner: boolean;
  isPrivate: boolean;
};

export async function getProfileView(
  username: string,
  viewerUsername?: string | null
): Promise<ProfileView | null> {
  const row = await getAccountByUsername(username);
  if (!row) return null;

  const settings = parseAccountSettings(row.settings);
  const isOwner = !!viewerUsername && viewerUsername === row.username;
  if (!settings.profilePublic && !isOwner) {
    return {
      account: rowToPublic(row),
      settings,
      badges: [],
      featuredBadge: null,
      history: [],
      isOwner: false,
      isPrivate: true,
    };
  }

  await syncBadgesForAccount(row.id, row.username);
  const badgeRows = await listBadgesForAccount(row.id);
  const allBadges = mapBadges(badgeRows);
  const featuredBadge = resolveFeaturedBadge(allBadges, settings.featuredBadgeSlug);
  const publicBadges = applyBadgeLayout(allBadges, settings);
  const badges =
    settings.showBadges || isOwner ? (isOwner ? allBadges : publicBadges) : [];
  const history =
    settings.showCommentHistory || isOwner
      ? await listCommentsForAccount(row.id)
      : [];

  return {
    account: rowToPublic(row),
    settings,
    badges,
    featuredBadge,
    history,
    isOwner,
    isPrivate: false,
  };
}

export async function countCommentsForAccount(accountId: number): Promise<number> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM post_comments WHERE account_id = $1`,
    [accountId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function usernameExists(username: string): Promise<boolean> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM ${ACCOUNTS_TABLE} WHERE username = $1) AS exists`,
    [username]
  );
  return rows[0]?.exists === true;
}

export async function appendActivity(accountId: number, entry: AccountActivityEntry): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE}
     SET activity = activity || $2::jsonb, updated_at = NOW()
     WHERE id = $1`,
    [accountId, JSON.stringify([entry])]
  );
}

export async function touchAccountIp(accountId: number, ip: string | null, entry: AccountActivityEntry): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE}
     SET last_ip = $2::inet, activity = activity || $3::jsonb, updated_at = NOW()
     WHERE id = $1`,
    [accountId, ip, JSON.stringify([entry])]
  );
}

export async function createSessionToken(accountId: number, ip: string | null): Promise<string> {
  const pool = await getPoolReady();
  const raw = newSessionToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + ACCOUNT_SESSION_MAX_AGE * 1000);
  await pool.query(
    `INSERT INTO ${ACCOUNT_TOKENS_TABLE} (account_id, token_hash, ip_address, expires_at)
     VALUES ($1, $2, $3::inet, $4)`,
    [accountId, tokenHash, ip, expiresAt]
  );
  return raw;
}

export async function deleteSessionToken(raw: string): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(`DELETE FROM ${ACCOUNT_TOKENS_TABLE} WHERE token_hash = $1`, [hashToken(raw)]);
}

export async function getAccountBySessionToken(raw: string): Promise<AccountPublic | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<Pick<AccountRow, "username" | "display_name" | "icon" | "bio" | "created_at">>(
    `SELECT a.username, a.display_name, a.icon, a.bio, a.created_at
     FROM ${ACCOUNT_TOKENS_TABLE} t
     JOIN ${ACCOUNTS_TABLE} a ON a.id = t.account_id
     WHERE t.token_hash = $1 AND t.expires_at > NOW()`,
    [hashToken(raw)]
  );
  return rows[0] ? rowToPublic(rows[0]) : null;
}

export async function getAccountIdBySessionToken(raw: string): Promise<number | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ account_id: number }>(
    `SELECT account_id FROM ${ACCOUNT_TOKENS_TABLE}
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [hashToken(raw)]
  );
  return rows[0]?.account_id ?? null;
}

export async function upsertBridge(input: {
  accountId: number;
  provider: BridgeProvider;
  providerUserId: string;
  tokens?: BridgeTokens;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `INSERT INTO ${ACCOUNT_BRIDGES_TABLE}
       (account_id, provider, provider_user_id, tokens, metadata)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
     ON CONFLICT (provider, provider_user_id)
     DO UPDATE SET
       account_id = EXCLUDED.account_id,
       tokens = EXCLUDED.tokens,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`,
    [
      input.accountId,
      input.provider,
      input.providerUserId,
      JSON.stringify(input.tokens ?? {}),
      JSON.stringify(input.metadata ?? {}),
    ]
  );
}

export async function listBridgesForAccount(accountId: number): Promise<{ provider: string }[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ provider: string }>(
    `SELECT provider FROM ${ACCOUNT_BRIDGES_TABLE} WHERE account_id = $1`,
    [accountId]
  );
  return rows;
}

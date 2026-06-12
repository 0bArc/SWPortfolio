import { randomBytes } from "node:crypto";
import { hashToken, sessionTokenHashes } from "@/lib/crypto";
import { maskedStoredEmail, prepareEmailStorage } from "@/database/emails";
import { getPoolReady } from "@/database";
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
} from "@/database/schema";
import type { BridgeProvider, BridgeTokens } from "@/features/accounts/services/auth/bridges";
import { applyBadgeLayout } from "@/features/accounts/services/badges/display";
import { grantKeyFor, resolvePublicDisplayBadge } from "@/features/accounts/services/badges/catalog";
import { mapBadges, syncBadgesForAccount } from "@/features/accounts/services/badges/service";
import { parseAccountSettings, settingsToJson } from "@/features/accounts/services/settings/parse";
import { listCommentsForAccount, type CommentHistoryItem } from "@/database/comments";
import type { AccountBadge, AccountSession } from "@/database/schema";
import { isAccountEmailVerified } from "@/database/email-verification";
import { BAN_SELECT, getAccountBan, banAccount, unbanAccount } from "@/database/ban";

export { banAccount, unbanAccount, getAccountBan };

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

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createAccount(input: {
  username: string;
  displayName: string;
  passwordHash: string;
  icon?: string | null;
  signupIp?: string | null;
  email?: string | null;
  emailVerified?: boolean;
}): Promise<AccountPublic> {
  const pool = await getPoolReady();
  const activity: AccountActivityEntry[] = [
    { type: "signup", at: new Date().toISOString(), ip: input.signupIp ?? null },
  ];
  const emailPlain = input.email?.trim().toLowerCase() ?? null;
  const verifiedAt = input.emailVerified || !emailPlain ? new Date() : null;
  const emailStored = emailPlain ? prepareEmailStorage(emailPlain) : null;
  const { rows } = await pool.query<AccountRow>(
    `INSERT INTO ${ACCOUNTS_TABLE}
       (username, display_name, icon, password_hash, signup_ip, last_ip, activity, email, email_hash, email_verified_at)
     VALUES ($1, $2, $3, $4, $5::inet, $5::inet, $6::jsonb, $7, $8, $9)
     RETURNING username, display_name, icon, bio, created_at`,
    [
      input.username,
      input.displayName,
      input.icon ?? null,
      input.passwordHash,
      input.signupIp ?? null,
      JSON.stringify(activity),
      emailStored?.ciphertext ?? null,
      emailStored?.lookupHash ?? null,
      verifiedAt,
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

export async function listAccountsReferencingImage(imageId: string): Promise<number[]> {
  const pool = await getPoolReady();
  const url = `/api/images/${imageId}`;
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM ${ACCOUNTS_TABLE} WHERE icon = $1 OR icon_pending = $1`,
    [url]
  );
  return rows.map((r) => r.id);
}

/** Member upload — visible to owner only until admin approves. */
export async function submitAccountIconPending(accountId: number, iconUrl: string): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET icon_pending = $2, updated_at = NOW() WHERE id = $1`,
    [accountId, iconUrl]
  );
}

export async function clearAccountIcons(accountId: number): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET icon = NULL, icon_pending = NULL, updated_at = NOW() WHERE id = $1`,
    [accountId]
  );
}

export async function approveAccountIcon(accountId: number): Promise<boolean> {
  const pool = await getPoolReady();
  const { rowCount } = await pool.query(
    `UPDATE ${ACCOUNTS_TABLE}
     SET icon = icon_pending, icon_pending = NULL, updated_at = NOW()
     WHERE id = $1 AND icon_pending IS NOT NULL`,
    [accountId]
  );
  return (rowCount ?? 0) > 0;
}

export async function rejectAccountIcon(accountId: number): Promise<boolean> {
  const pool = await getPoolReady();
  const { rowCount } = await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET icon_pending = NULL, updated_at = NOW()
     WHERE id = $1 AND icon_pending IS NOT NULL`,
    [accountId]
  );
  return (rowCount ?? 0) > 0;
}

export type PendingIconItem = {
  id: number;
  username: string;
  displayName: string;
  iconPending: string;
  createdAt: string;
};

export const PENDING_ICONS_PAGE_SIZE = 8;

export async function countPendingIconAccounts(): Promise<number> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${ACCOUNTS_TABLE} WHERE icon_pending IS NOT NULL`
  );
  return Number(rows[0]?.count ?? 0);
}

export async function listPendingIconAccounts(
  page = 1,
  pageSize = PENDING_ICONS_PAGE_SIZE
): Promise<PendingIconItem[]> {
  const pool = await getPoolReady();
  const offset = Math.max(0, (page - 1) * pageSize);
  const { rows } = await pool.query<{
    id: number;
    username: string;
    display_name: string;
    icon_pending: string;
    created_at: Date;
  }>(
    `SELECT id, username, display_name, icon_pending, created_at
     FROM ${ACCOUNTS_TABLE}
     WHERE icon_pending IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    iconPending: r.icon_pending,
    createdAt: r.created_at.toISOString(),
  }));
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
  bio: string;
  icon: string | null;
  icon_pending: string | null;
  created_at: Date;
  settings: unknown;
  comment_count: string;
  badge_slugs: string[] | null;
  email: string | null;
  email_verified_at: Date | null;
  banned_at: Date | null;
  ban_reason: string | null;
  banned_until: Date | null;
  banned_by_username: string | null;
  banned_by_display_name: string | null;
  warning_count: string;
};

function mapAccountListRow(row: AccountListRow): AccountListItem {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? "",
    icon: row.icon,
    iconPending: row.icon_pending,
    createdAt: row.created_at.toISOString(),
    commentCount: Number(row.comment_count),
    badgeSlugs: row.badge_slugs ?? [],
    settings: parseAccountSettings(row.settings),
    emailVerified: !row.email || row.email_verified_at != null,
    bannedAt: row.banned_at?.toISOString() ?? null,
    banReason: row.ban_reason ?? null,
    bannedUntil: row.banned_until?.toISOString() ?? null,
    bannedBy: row.banned_by_username
      ? {
          username: row.banned_by_username,
          displayName: row.banned_by_display_name ?? row.banned_by_username,
        }
      : null,
    warningCount: Number(row.warning_count ?? 0),
  };
}

const ACCOUNT_LIST_SELECT = `
  SELECT a.id, a.username, a.display_name, a.bio, a.icon, a.icon_pending, a.created_at, a.settings,
    a.email, a.email_verified_at, ${BAN_SELECT},
    (SELECT COUNT(*)::text FROM ${POST_COMMENTS_TABLE} c WHERE c.account_id = a.id) AS comment_count,
    (SELECT COALESCE(array_agg(DISTINCT b.slug), '{}') FROM ${ACCOUNT_BADGES_TABLE} b WHERE b.account_id = a.id) AS badge_slugs,
    (SELECT COUNT(*)::text FROM notifications n WHERE n.account_id = a.id AND n.type = 'staff_warning') AS warning_count`;

const ACCOUNT_LIST_FROM = `FROM ${ACCOUNTS_TABLE} a LEFT JOIN ${ACCOUNTS_TABLE} staff ON staff.id = a.banned_by_account_id`;

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
  const base = `${ACCOUNT_LIST_SELECT} ${ACCOUNT_LIST_FROM}`;

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
    `${ACCOUNT_LIST_SELECT} ${ACCOUNT_LIST_FROM} WHERE a.username = $1`,
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
  const featuredBadge = resolvePublicDisplayBadge(allBadges, settings.featuredBadgeSlug);
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
  const tokenHash = hashToken(raw, "session");
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
  const hashes = sessionTokenHashes(raw);
  await pool.query(
    `DELETE FROM ${ACCOUNT_TOKENS_TABLE} WHERE token_hash = ANY($1::text[])`,
    [hashes]
  );
}

export async function getAccountBySessionToken(raw: string): Promise<AccountPublic | null> {
  const session = await getAccountSessionByToken(raw);
  return session;
}

export type UnverifiedAccountItem = {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;
};

export async function listUnverifiedEmailAccounts(limit = 20): Promise<UnverifiedAccountItem[]> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{
    id: number;
    username: string;
    display_name: string;
    created_at: Date;
  }>(
    `SELECT id, username, display_name, created_at
     FROM ${ACCOUNTS_TABLE}
     WHERE email IS NOT NULL AND email_verified_at IS NULL
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function getAccountSessionByToken(raw: string): Promise<AccountSession | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<
    Pick<AccountRow, "username" | "display_name" | "icon" | "bio" | "created_at"> & {
      account_id: number;
      icon_pending: string | null;
      email: string | null;
      email_verified_at: Date | null;
    }
  >(
    `SELECT a.id AS account_id, a.username, a.display_name, a.icon, a.icon_pending, a.bio, a.created_at, a.email, a.email_verified_at
     FROM ${ACCOUNT_TOKENS_TABLE} t
     JOIN ${ACCOUNTS_TABLE} a ON a.id = t.account_id
     WHERE t.token_hash = ANY($1::text[]) AND t.expires_at > NOW()`,
    [sessionTokenHashes(raw)]
  );
  const row = rows[0];
  if (!row) return null;
  const ban = await getAccountBan(row.account_id);
  return {
    ...rowToPublic(row),
    email: maskedStoredEmail(row.email),
    emailVerified: !row.email || row.email_verified_at != null,
    iconPending: row.icon_pending,
    ban,
  };
}

export async function getAccountSessionById(accountId: number): Promise<AccountSession | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<
    Pick<AccountRow, "username" | "display_name" | "icon" | "bio" | "created_at"> & {
      icon_pending: string | null;
      email: string | null;
      email_verified_at: Date | null;
    }
  >(
    `SELECT username, display_name, icon, icon_pending, bio, created_at, email, email_verified_at
     FROM ${ACCOUNTS_TABLE} WHERE id = $1`,
    [accountId]
  );
  const row = rows[0];
  if (!row) return null;
  const ban = await getAccountBan(accountId);
  return {
    ...rowToPublic(row),
    email: maskedStoredEmail(row.email),
    emailVerified: !row.email || row.email_verified_at != null,
    iconPending: row.icon_pending,
    ban,
  };
}

export async function isEmailVerifiedForAccount(accountId: number): Promise<boolean> {
  return isAccountEmailVerified(accountId);
}

export async function getAccountIdBySessionToken(raw: string): Promise<number | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ account_id: number }>(
    `SELECT account_id FROM ${ACCOUNT_TOKENS_TABLE}
     WHERE token_hash = ANY($1::text[]) AND expires_at > NOW()`,
    [sessionTokenHashes(raw)]
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

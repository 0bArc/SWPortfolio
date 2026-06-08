import type { AccountBadge, AccountSettings } from "@/db/schema";
import { BADGE_BY_SLUG, BADGES, isManuallyGrantable } from "@/lib/accounts/badges";
import { mapBadges } from "@/lib/accounts/badge-service";
import { isValidDisplayName } from "@/lib/accounts/validation";
import {
  canGrantBadge,
  hasPermission,
  isEnvAdmin,
  resolvePermissions,
  type Permission,
} from "@/lib/accounts/permissions";
import {
  awardBadge,
  countAccounts,
  deleteAccount,
  getAccountByUsername,
  getAccountListItem,
  listAccountsPaginated,
  listBadgesForAccount,
  revokeBadge,
  updateAccountDisplayName,
  updateAccountSettings,
} from "@/lib/db/accounts";
import type { AccountListItem } from "@/db/schema";

export type BadgeActor = {
  accountId: number;
  username: string;
};

export type AwardBadgeResult =
  | { ok: true; badge: AccountBadge; badges: AccountBadge[] }
  | { ok: false; error: string; status: number };

export type AdminUserPatch = {
  displayName?: string;
  settings?: Partial<AccountSettings>;
};

export type AdminActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export const ADMIN_USERS_PAGE_SIZE = 10;

export function listGrantableBadgeSlugs(perms: Set<Permission>): string[] {
  return BADGES.filter((b) => isManuallyGrantable(b) && canGrantBadge(perms, b.slug))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
    .map((b) => b.slug);
}

export async function getActorPermissions(actor: BadgeActor): Promise<Set<Permission>> {
  return resolvePermissions(actor.accountId, actor.username);
}

export async function awardBadgeToUsername(
  actor: BadgeActor,
  targetUsername: string,
  slug: string
): Promise<AwardBadgeResult> {
  const normalized = targetUsername.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, error: "Username required", status: 400 };
  }

  const def = BADGE_BY_SLUG[slug];
  if (!def) {
    return { ok: false, error: "Unknown badge", status: 400 };
  }

  const perms = await resolvePermissions(actor.accountId, actor.username);
  if (!hasPermission(perms, "badges:award")) {
    return { ok: false, error: "Not allowed", status: 403 };
  }
  if (!canGrantBadge(perms, slug)) {
    return { ok: false, error: "Cannot grant that badge", status: 403 };
  }

  const target = await getAccountByUsername(normalized);
  if (!target) {
    return { ok: false, error: "User not found", status: 404 };
  }

  const granted = await awardBadge(target.id, slug, actor.accountId);
  const badges = mapBadges(await listBadgesForAccount(target.id));
  const badge = badges.find((b) => b.slug === slug);
  if (!badge) {
    return { ok: false, error: "Grant failed", status: 500 };
  }
  if (!granted) {
    const msg =
      def.stack.kind === "year"
        ? "Already awarded for this year"
        : def.stack.kind === "unlimited"
          ? "Grant failed"
          : "User already has this badge";
    return { ok: false, error: msg, status: 409 };
  }

  return { ok: true, badge, badges };
}

// —— Admin panel (caller must requireAdmin) ——

export async function adminListUsers(
  page: number,
  query?: string
): Promise<{ users: AccountListItem[]; total: number; page: number; pageSize: number }> {
  const safePage = Math.max(1, page);
  const [users, total] = await Promise.all([
    listAccountsPaginated(safePage, ADMIN_USERS_PAGE_SIZE, query),
    countAccounts(query),
  ]);
  return { users, total, page: safePage, pageSize: ADMIN_USERS_PAGE_SIZE };
}

export async function adminGetUser(username: string): Promise<AdminActionResult<AccountListItem>> {
  const row = await getAccountListItem(username.trim().toLowerCase());
  if (!row) return { ok: false, error: "User not found", status: 404 };
  return { ok: true, data: row };
}

export async function adminUpdateUser(
  username: string,
  patch: AdminUserPatch
): Promise<AdminActionResult<AccountListItem>> {
  const normalized = username.trim().toLowerCase();
  const row = await getAccountByUsername(normalized);
  if (!row) return { ok: false, error: "User not found", status: 404 };

  if (patch.displayName !== undefined) {
    if (!isValidDisplayName(patch.displayName)) {
      return { ok: false, error: "Invalid display name", status: 400 };
    }
    await updateAccountDisplayName(row.id, patch.displayName.trim());
  }

  if (patch.settings) {
    await updateAccountSettings(row.id, patch.settings);
  }

  const updated = await getAccountListItem(normalized);
  if (!updated) return { ok: false, error: "User not found", status: 404 };
  return { ok: true, data: updated };
}

export async function adminDeleteUser(username: string): Promise<AdminActionResult> {
  const normalized = username.trim().toLowerCase();
  if (isEnvAdmin(normalized)) {
    return { ok: false, error: "Cannot delete the site admin account", status: 403 };
  }
  const row = await getAccountByUsername(normalized);
  if (!row) return { ok: false, error: "User not found", status: 404 };
  await deleteAccount(row.id);
  return { ok: true, data: undefined };
}

export async function adminGrantBadge(
  username: string,
  slug: string
): Promise<AdminActionResult<AccountListItem>> {
  const normalized = username.trim().toLowerCase();
  if (!BADGE_BY_SLUG[slug]) return { ok: false, error: "Unknown badge", status: 400 };

  const row = await getAccountByUsername(normalized);
  if (!row) return { ok: false, error: "User not found", status: 404 };

  const granted = await awardBadge(row.id, slug, null);
  if (!granted) return { ok: false, error: "Badge already granted for this period", status: 409 };
  const updated = await getAccountListItem(normalized);
  if (!updated) return { ok: false, error: "User not found", status: 404 };
  return { ok: true, data: updated };
}

export async function adminRevokeBadge(
  username: string,
  slug: string
): Promise<AdminActionResult<AccountListItem>> {
  const normalized = username.trim().toLowerCase();
  if (!BADGE_BY_SLUG[slug]) return { ok: false, error: "Unknown badge", status: 400 };

  const row = await getAccountByUsername(normalized);
  if (!row) return { ok: false, error: "User not found", status: 404 };

  const revoked = await revokeBadge(row.id, slug);
  if (!revoked) return { ok: false, error: "User does not have that badge", status: 404 };

  const updated = await getAccountListItem(normalized);
  if (!updated) return { ok: false, error: "User not found", status: 404 };
  return { ok: true, data: updated };
}

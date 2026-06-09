import type { AccountBadge, AccountSettings } from "@/database/schema";
import { BADGE_BY_SLUG } from "@/features/accounts/services/badges/definitions";
import { listStaffAwardableSlugs, roleRankFromSlugs } from "@/features/accounts/services/badges/award";
import { mapBadges } from "@/features/accounts/services/badges/service";
import { isValidDisplayName } from "@/features/accounts/services/validation/fields";
import {
  canActOnUser,
  canGrantBadge,
  hasPermission,
  isEnvAdmin,
  resolvePermissions,
  type Permission,
} from "@/features/accounts/services/permissions/resolve";
import {
  assertCanActOnTarget,
  resolveAdminActor,
  type AdminActor,
} from "@/features/accounts/services/permissions/actor";
import { markEmailVerified } from "@/database/email-verification";
import { createNotification } from "@/database/notifications";
import { banAccount, unbanAccount } from "@/database/ban";
import {
  awardBadge,
  countAccounts,
  deleteAccount,
  distinctBadgeSlugs,
  getAccountByUsername,
  getAccountListItem,
  listAccountsPaginated,
  listBadgesForAccount,
  listUnverifiedEmailAccounts,
  revokeBadge,
  updateAccountBio,
  updateAccountDisplayName,
  updateAccountSettings,
} from "@/database/accounts";
import type { AccountListItem } from "@/database/schema";

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

export function listGrantableBadgeSlugs(
  perms: Set<Permission>,
  actorSlugs: Iterable<string>
): string[] {
  return listStaffAwardableSlugs(roleRankFromSlugs(actorSlugs), perms);
}

export async function getActorPermissions(actor: BadgeActor): Promise<Set<Permission>> {
  return resolvePermissions(actor.accountId, actor.username);
}

async function guardTarget(
  actor: AdminActor,
  targetUsername: string
): Promise<AdminActionResult | null> {
  const check = await assertCanActOnTarget(actor, targetUsername);
  if (!check.ok) return { ok: false, error: check.error, status: 403 };
  return null;
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

  const actorSlugs = await distinctBadgeSlugs(actor.accountId);
  const actorRank = roleRankFromSlugs(actorSlugs);
  const perms = await resolvePermissions(actor.accountId, actor.username);
  if (!canGrantBadge(perms, slug, actorRank)) {
    return { ok: false, error: "Cannot grant that badge", status: 403 };
  }

  const target = await getAccountByUsername(normalized);
  if (!target) {
    return { ok: false, error: "User not found", status: 404 };
  }

  const targetSlugs = await distinctBadgeSlugs(target.id);
  const rankCheck = canActOnUser({
    actorUsername: actor.username,
    actorSlugs,
    targetUsername: target.username,
    targetSlugs,
  });
  if (!rankCheck.ok) {
    return { ok: false, error: rankCheck.error, status: 403 };
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
  const actor = await resolveAdminActor();
  const blocked = await guardTarget(actor, username);
  if (blocked) return blocked;

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
  const actor = await resolveAdminActor();
  const blocked = await guardTarget(actor, username);
  if (blocked) return blocked;

  const normalized = username.trim().toLowerCase();
  if (isEnvAdmin(normalized)) {
    return { ok: false, error: "Cannot delete the protected admin account", status: 403 };
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
  const actor = await resolveAdminActor();
  const blocked = await guardTarget(actor, username);
  if (blocked) return blocked;

  if (actor.kind === "account") {
    const actorRank = roleRankFromSlugs(actor.slugs);
    if (!canGrantBadge(actor.perms, slug, actorRank)) {
      return { ok: false, error: "Cannot grant that badge", status: 403 };
    }
  }

  const normalized = username.trim().toLowerCase();
  if (!BADGE_BY_SLUG[slug]) return { ok: false, error: "Unknown badge", status: 400 };

  const row = await getAccountByUsername(normalized);
  if (!row) return { ok: false, error: "User not found", status: 404 };

  const granted = await awardBadge(row.id, slug, actor.kind === "account" ? actor.accountId : null);
  if (!granted) return { ok: false, error: "Badge already granted for this period", status: 409 };
  const updated = await getAccountListItem(normalized);
  if (!updated) return { ok: false, error: "User not found", status: 404 };
  return { ok: true, data: updated };
}

export async function adminListUnverifiedUsers() {
  return listUnverifiedEmailAccounts(30);
}

async function notifyUser(
  accountId: number,
  type: string,
  message: string
): Promise<void> {
  await createNotification({
    accountId,
    actorAccountId: null,
    type,
    message,
  });
}

export async function adminForceVerifyEmail(
  username: string
): Promise<AdminActionResult<AccountListItem>> {
  const actor = await resolveAdminActor();
  const blocked = await guardTarget(actor, username);
  if (blocked) return blocked;

  if (actor.kind === "account" && !hasPermission(actor.perms, "admin:users")) {
    return { ok: false, error: "Not allowed", status: 403 };
  }

  const normalized = username.trim().toLowerCase();
  const row = await getAccountByUsername(normalized);
  if (!row) return { ok: false, error: "User not found", status: 404 };

  await markEmailVerified(row.id);
  await notifyUser(
    row.id,
    "staff_action",
    "Your email has been verified by staff. You now have full access."
  );

  const updated = await getAccountListItem(normalized);
  if (!updated) return { ok: false, error: "User not found", status: 404 };
  return { ok: true, data: updated };
}

export async function adminModerateUser(
  username: string,
  action: {
    type: "force_name" | "force_bio" | "warn" | "ban" | "unban";
    displayName?: string;
    bio?: string;
    message?: string;
    reason?: string;
    banUntil?: string | null;
    bannedByAccountId?: number | null;
    notify?: boolean;
  }
): Promise<AdminActionResult<AccountListItem>> {
  const actor = await resolveAdminActor();
  const blocked = await guardTarget(actor, username);
  if (blocked) return blocked;

  if (actor.kind === "account") {
    const needsMod =
      action.type === "warn" || action.type === "ban" || action.type === "unban";
    const needsAdmin =
      action.type === "force_name" || action.type === "force_bio";
    if (needsMod && !hasPermission(actor.perms, "users:moderate") && !hasPermission(actor.perms, "admin:users")) {
      return { ok: false, error: "Not allowed", status: 403 };
    }
    if (needsAdmin && !hasPermission(actor.perms, "admin:users")) {
      return { ok: false, error: "Not allowed", status: 403 };
    }
  }

  const normalized = username.trim().toLowerCase();
  const row = await getAccountByUsername(normalized);
  if (!row) return { ok: false, error: "User not found", status: 404 };

  switch (action.type) {
    case "force_name": {
      const name = action.displayName?.trim() ?? "";
      if (!isValidDisplayName(name)) {
        return { ok: false, error: "Invalid display name", status: 400 };
      }
      await updateAccountDisplayName(row.id, name);
      if (action.notify !== false) {
        await notifyUser(
          row.id,
          "staff_action",
          `Staff changed your display name to "${name}". Contact support if this is wrong.`
        );
      }
      break;
    }
    case "force_bio": {
      const bio = (action.bio ?? "").trim().slice(0, 500);
      await updateAccountBio(row.id, bio);
      if (action.notify !== false) {
        await notifyUser(
          row.id,
          "staff_action",
          "Staff updated your profile description. Check your profile and contact support if needed."
        );
      }
      break;
    }
    case "warn": {
      const msg = action.message?.trim() ?? "";
      if (!msg) return { ok: false, error: "Warning message required", status: 400 };
      await notifyUser(row.id, "staff_warning", `Staff warning: ${msg}`);
      break;
    }
    case "ban": {
      await banAccount({
        accountId: row.id,
        reason: action.reason,
        until: action.banUntil,
        bannedByAccountId: action.bannedByAccountId ?? null,
      });
      const untilNote = action.banUntil
        ? ` until ${new Date(action.banUntil).toLocaleString("en-GB")}`
        : "";
      await notifyUser(
        row.id,
        "staff_action",
        action.reason?.trim()
          ? `Your account has been suspended${untilNote}: ${action.reason.trim()}`
          : `Your account has been suspended${untilNote}.`
      );
      break;
    }
    case "unban": {
      await unbanAccount(row.id);
      await notifyUser(row.id, "staff_action", "Your account suspension has been lifted.");
      break;
    }
    default:
      return { ok: false, error: "Unknown action", status: 400 };
  }

  const updated = await getAccountListItem(normalized);
  if (!updated) return { ok: false, error: "User not found", status: 404 };
  return { ok: true, data: updated };
}

export async function adminRevokeBadge(
  username: string,
  slug: string
): Promise<AdminActionResult<AccountListItem>> {
  const actor = await resolveAdminActor();
  const blocked = await guardTarget(actor, username);
  if (blocked) return blocked;

  if (actor.kind === "account") {
    const actorRank = roleRankFromSlugs(actor.slugs);
    if (!canGrantBadge(actor.perms, slug, actorRank)) {
      return { ok: false, error: "Cannot revoke that badge", status: 403 };
    }
  }

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

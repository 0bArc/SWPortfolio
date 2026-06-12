import type { AdminActor } from "@/features/accounts/services/permissions/actor";
import { roleRankFromSlugs } from "@/features/accounts/services/badges/award";
import {
  canAccessAdminSettings,
  hasPermission,
} from "@/features/accounts/services/permissions/resolve";

/** Posts, media, tags — founder, administrator, developer (not moderators). */
export function canAccessAdminCms(actor: AdminActor): boolean {
  if (actor.kind === "full") return true;
  if (hasPermission(actor.perms, "admin:users")) return true;
  return roleRankFromSlugs(actor.slugs) <= 2;
}

export function canManageAdminUsers(actor: AdminActor): boolean {
  if (actor.kind === "full") return true;
  return hasPermission(actor.perms, "admin:users");
}

/** Moderators see community accounts only — hide founder/admin/dev/mod staff rows. */
export function shouldExcludeStaffFromUserList(actor: AdminActor): boolean {
  if (actor.kind === "full") return false;
  return hasPermission(actor.perms, "users:moderate") && !hasPermission(actor.perms, "admin:users");
}

export function showAdminSettingsNav(actor: AdminActor): boolean {
  if (actor.kind === "full") return true;
  return actor.kind === "account" && canAccessAdminSettings(actor.slugs, actor.username);
}

/** Staff with admin panel access — audit trail visibility. */
export function canViewAuditLogs(actor: AdminActor): boolean {
  if (actor.kind === "full") return true;
  return hasPermission(actor.perms, "admin:panel");
}

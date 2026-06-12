import type { NextRequest } from "next/server";
import { BADGE_BY_SLUG } from "@/features/accounts/services/badges/catalog";
import {
  adminForceVerifyEmail,
  adminModerateUser,
  awardBadgeToUsername,
  listGrantableBadgeSlugs,
  adminRevokeBadge,
} from "@/features/accounts/services/admin/manager";
import { getActorPermissions } from "@/features/accounts/services/admin/manager";
import { requireStaffPanel, requireStaffPermission } from "@/features/accounts/services/staff/guard";
import { hasPermission } from "@/features/accounts/services/permissions/resolve";
import { distinctBadgeSlugs, getAccountListItem } from "@/database/accounts";
import { jsonError } from "@/lib/network/http";
import { assertSameOrigin, rateLimit } from "@/lib/network/server/security";

export async function handleGetStaffTarget(username: string): Promise<Response> {
  const modAuth = await requireStaffPanel();
  if (modAuth instanceof Response) return modAuth;

  const normalized = username.trim().toLowerCase();
  const target = await getAccountListItem(normalized);
  if (!target) return jsonError("User not found", 404);

  const perms = await getActorPermissions({
    accountId: modAuth.accountId,
    username: modAuth.username,
  });
  const actorSlugs = await distinctBadgeSlugs(modAuth.accountId);
  const grantable = listGrantableBadgeSlugs(perms, actorSlugs).map((slug) => {
    const def = BADGE_BY_SLUG[slug]!;
    return { slug, label: def.label, description: def.description };
  });

  return Response.json({
    target: {
      username: target.username,
      displayName: target.displayName,
      bio: target.bio,
      badgeSlugs: target.badgeSlugs,
      badges: target.badgeSlugs.map((slug) => ({
        slug,
        label: BADGE_BY_SLUG[slug]?.label ?? slug,
      })),
      bannedAt: target.bannedAt,
      banReason: target.banReason,
      bannedUntil: target.bannedUntil,
      bannedBy: target.bannedBy,
      warningCount: target.warningCount,
      emailVerified: target.emailVerified,
    },
    capabilities: {
      canAwardBadges: grantable.length > 0,
      canModerate:
        hasPermission(perms, "users:moderate") || hasPermission(perms, "admin:users"),
      grantable,
    },
  });
}

export async function handleStaffAwardBadge(
  request: NextRequest,
  username: string
): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "staff-badge", 40, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireStaffPanel();
  if (auth instanceof Response) return auth;

  let body: { slug?: string; slugs?: string[] };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const slugs = body.slugs?.length
    ? body.slugs
    : body.slug
      ? [body.slug]
      : [];
  if (slugs.length === 0) return jsonError("slug or slugs required", 400);

  const awarded: string[] = [];
  const errors: string[] = [];

  for (const slug of slugs) {
    const result = await awardBadgeToUsername(
      { accountId: auth.accountId, username: auth.username },
      username,
      slug.trim()
    );
    if (result.ok) awarded.push(slug);
    else errors.push(result.error);
  }

  const target = await getAccountListItem(username.trim().toLowerCase());
  if (!target) return jsonError("User not found", 404);

  if (awarded.length === 0) {
    return jsonError(errors[0] ?? "Could not award badges", 400);
  }

  return Response.json({
    ok: true,
    awarded,
    errors: errors.length ? errors : undefined,
    target,
  });
}

export async function handleStaffRevokeBadge(
  request: NextRequest,
  username: string
): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "staff-badge-revoke", 40, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireStaffPanel();
  if (auth instanceof Response) return auth;

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const slug = body.slug?.trim();
  if (!slug) return jsonError("slug required", 400);

  const result = await adminRevokeBadge(username, slug);
  if (!result.ok) return jsonError(result.error, result.status);

  return Response.json(result.data);
}

export async function handleStaffModerate(
  request: NextRequest,
  username: string
): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "staff-moderate", 30, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireStaffPanel();
  if (auth instanceof Response) return auth;

  let body: {
    type?: string;
    displayName?: string;
    bio?: string;
    message?: string;
    reason?: string;
    banUntil?: string | null;
    notify?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const type = body.type?.trim();
  if (
    type !== "force_name" &&
    type !== "force_bio" &&
    type !== "warn" &&
    type !== "ban" &&
    type !== "unban" &&
    type !== "force_verify_email"
  ) {
    return jsonError("Invalid moderation type", 400);
  }

  if (type === "force_verify_email") {
    const result = await adminForceVerifyEmail(username);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json(result.data);
  }

  const result = await adminModerateUser(username, {
    type,
    displayName: body.displayName,
    bio: body.bio,
    message: body.message,
    reason: body.reason,
    banUntil: body.banUntil,
    bannedByAccountId: type === "ban" ? auth.accountId : undefined,
    notify: body.notify,
  });
  if (!result.ok) return jsonError(result.error, result.status);

  return Response.json(result.data);
}

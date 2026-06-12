import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword } from "@/features/accounts/services/auth/password";
import { mapBadges, syncBadgesForAccount } from "@/features/accounts/services/badges/service";
import type { AccountSettings } from "@/database/schema";
import { requireActiveAccount, ACCOUNT_SESSION_COOKIE, sessionCookieOpts } from "@/features/accounts/services/auth/session";
import { isValidBio, isValidDisplayName } from "@/features/accounts/services/validation/fields";
import {
  deleteAccount,
  deleteSessionToken,
  getAccountByUsername,
  getAccountSettings,
  listBadgesForAccount,
  updateAccountBio,
  updateAccountDisplayName,
  updateAccountSettings,
} from "@/database/accounts";
import { listCommentsForAccount } from "@/database/comments";
import { assertSameOrigin, rateLimit } from "@/lib/network/server/security";
import { dispatchSiteEvent, type ProfileField } from "@/features/events";
import { jsonError } from "@/lib/network/http";

export async function handleGetSettings(): Promise<Response> {
  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const row = await getAccountByUsername(auth.account.username);
  if (!row) return jsonError("Account not found", 404);

  await syncBadgesForAccount(row.id, row.username);
  const settings = await getAccountSettings(row.id);
  const badges = mapBadges(await listBadgesForAccount(row.id));
  const history = await listCommentsForAccount(row.id);

  return Response.json({
    settings,
    badges,
    history,
    icon: row.icon,
    iconPending: row.icon_pending ?? null,
    pendingReview: Boolean(row.icon_pending),
    displayName: row.display_name,
    username: row.username,
    bio: row.bio ?? "",
  });
}

export async function handlePatchSettings(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "settings", 30, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  let body: Partial<AccountSettings> & { displayName?: string; bio?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  const patch: Partial<AccountSettings> = {};
  if (typeof body.profilePublic === "boolean") patch.profilePublic = body.profilePublic;
  if (typeof body.showBadges === "boolean") patch.showBadges = body.showBadges;
  if (typeof body.showCommentHistory === "boolean") patch.showCommentHistory = body.showCommentHistory;

  if (body.featuredBadgeSlug === null || body.featuredBadgeSlug === "") {
    patch.featuredBadgeSlug = null;
  } else if (typeof body.featuredBadgeSlug === "string") {
    const slug = body.featuredBadgeSlug.trim();
    const held = new Set((await listBadgesForAccount(auth.accountId)).map((r) => r.slug));
    if (!held.has(slug)) {
      return jsonError("You do not have that badge", 400);
    }
    patch.featuredBadgeSlug = slug;
  }

  const heldSlugs = new Set((await listBadgesForAccount(auth.accountId)).map((r) => r.slug));
  if (Array.isArray(body.badgeOrder)) {
    patch.badgeOrder = body.badgeOrder
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter((s) => heldSlugs.has(s));
  }
  if (Array.isArray(body.hiddenBadgeSlugs)) {
    patch.hiddenBadgeSlugs = body.hiddenBadgeSlugs
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter((s) => heldSlugs.has(s));
  }

  let displayName: string | undefined;
  if (typeof body.displayName === "string") {
    const trimmed = body.displayName.trim();
    if (!isValidDisplayName(trimmed)) {
      return jsonError("Display name required (max 64 chars)", 400);
    }
    displayName = trimmed;
  }

  let bio: string | undefined;
  if (typeof body.bio === "string") {
    const trimmed = body.bio.trim();
    if (!isValidBio(trimmed)) {
      return jsonError("Bio max 500 characters", 400);
    }
    bio = trimmed;
  }

  if (Object.keys(patch).length === 0 && !displayName && bio === undefined) {
    return jsonError("No valid fields provided", 400);
  }

  let settings = await getAccountSettings(auth.accountId);
  if (Object.keys(patch).length > 0) {
    settings = await updateAccountSettings(auth.accountId, patch);
  }
  if (displayName) {
    await updateAccountDisplayName(auth.accountId, displayName);
  }
  if (bio !== undefined) {
    await updateAccountBio(auth.accountId, bio);
  }

  const changed: ProfileField[] = [];
  if (displayName) changed.push("displayName");
  if (bio !== undefined) changed.push("bio");
  if (Object.keys(patch).length > 0) changed.push("settings");
  if (changed.length > 0) {
    await dispatchSiteEvent({
      type: "profile.updated",
      actorAccountId: auth.accountId,
      username: auth.account.username,
      changed,
    });
  }

  const row = await getAccountByUsername(auth.account.username);
  return Response.json({
    settings,
    displayName: row?.display_name ?? displayName,
    bio: row?.bio ?? bio,
    account: row
      ? {
          username: row.username,
          displayName: row.display_name,
          icon: row.icon,
        }
      : undefined,
  });
}

export async function handleDeleteAccount(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "delete-account", 3, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  let body: { password?: string; confirm?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  if (body.confirm !== "DELETE") {
    return jsonError('Type DELETE to confirm', 400);
  }

  const row = await getAccountByUsername(auth.account.username);
  if (!row || !(await verifyPassword(body.password ?? "", row.password_hash))) {
    return jsonError("Invalid password", 401);
  }

  const jar = await cookies();
  const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (raw) await deleteSessionToken(raw);

  await dispatchSiteEvent({
    type: "account.deleted",
    actorAccountId: auth.accountId,
    username: auth.account.username,
    selfDelete: true,
  });
  await deleteAccount(auth.accountId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCOUNT_SESSION_COOKIE, "", { ...sessionCookieOpts(0), maxAge: 0 });
  return res;
}

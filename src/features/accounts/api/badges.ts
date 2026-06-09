import type { NextRequest } from "next/server";
import { BADGE_BY_SLUG } from "@/features/accounts/services/badges/catalog";
import { awardBadgeToUsername, getActorPermissions, listGrantableBadgeSlugs } from "@/features/accounts/services/admin/manager";
import { canUseStaffPanel } from "@/features/accounts/services/permissions/resolve";
import { requireActiveAccount } from "@/features/accounts/services/auth/session";
import { distinctBadgeSlugs } from "@/database/accounts";
import { assertSameOrigin, rateLimit } from "@/lib/network/server/security";
import { jsonError } from "@/lib/network/http";

export async function handleGetBadgeGrants(): Promise<Response> {
  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const perms = await getActorPermissions({
    accountId: auth.accountId,
    username: auth.account.username,
  });

  if (!canUseStaffPanel(perms)) {
    return Response.json({ grantable: [] });
  }

  const actorSlugs = await distinctBadgeSlugs(auth.accountId);
  const slugs = listGrantableBadgeSlugs(perms, actorSlugs);
  return Response.json({
    grantable: slugs.map((slug) => {
      const def = BADGE_BY_SLUG[slug]!;
      return {
        slug,
        label: def.label,
        description: def.description,
        group: def.group,
        stack: def.stack.kind,
      };
    }),
  });
}

export async function handlePostBadgeGrant(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "badge-grant", 40, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  let body: { username?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const username = body.username?.trim();
  const slug = body.slug?.trim();
  if (!username || !slug) {
    return jsonError("username and slug required", 400);
  }

  const result = await awardBadgeToUsername(
    { accountId: auth.accountId, username: auth.account.username },
    username,
    slug
  );

  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return Response.json({ badge: result.badge, badges: result.badges });
}

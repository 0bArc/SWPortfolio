import type { NextRequest } from "next/server";
import { BADGE_BY_SLUG } from "@/lib/accounts/badges";
import { awardBadgeToUsername, getActorPermissions, listGrantableBadgeSlugs } from "@/lib/accounts/manager";
import { hasPermission } from "@/lib/accounts/permissions";
import { requireAccount } from "@/lib/accounts/auth";
import { assertSameOrigin, rateLimit } from "@/api/lib/security";
import { jsonError } from "@/api/lib/http";

export async function handleGetBadgeGrants(): Promise<Response> {
  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  const perms = await getActorPermissions({
    accountId: auth.accountId,
    username: auth.account.username,
  });

  if (!hasPermission(perms, "badges:award")) {
    return Response.json({ grantable: [] });
  }

  const slugs = listGrantableBadgeSlugs(perms);
  return Response.json({
    grantable: slugs.map((slug) => {
      const def = BADGE_BY_SLUG[slug]!;
      return {
        slug,
        label: def.label,
        description: def.description,
        group: def.group,
        stack: def.stack.kind,
        privileged: !!def.grant.privileged,
      };
    }),
  });
}

export async function handlePostBadgeGrant(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "badge-grant", 40, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireAccount();
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

import type { NextRequest } from "next/server";
import { getAdminSession } from "@/features/admin/services/auth";
import { requireActiveAccount } from "@/features/accounts/services/auth/session";
import { canModerateComments, resolvePermissions } from "@/features/accounts/services/permissions/resolve";
import { assertSameOrigin, rateLimit, rateLimitAccount } from "@/lib/network/server/security";

export type ModeratorAuth =
  | { kind: "admin" }
  | { kind: "account"; accountId: number; username: string };

/** CMS admin cookie or account with comments:moderate. */
export async function requireModerator(request?: NextRequest): Promise<ModeratorAuth | Response> {
  if (await getAdminSession()) return { kind: "admin" };

  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const perms = await resolvePermissions(auth.accountId, auth.account.username);
  if (!canModerateComments(perms, auth.account.username)) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }
  return { kind: "account", accountId: auth.accountId, username: auth.account.username };
}

export function guardMutation(
  request: NextRequest,
  action: string,
  max = 40,
  windowMs = 60 * 60 * 1000
): Response | null {
  return assertSameOrigin(request) ?? rateLimit(request, action, max, windowMs);
}

export function guardAccountMutation(
  accountId: number,
  action: string,
  max = 60,
  windowMs = 60 * 60 * 1000
): Response | null {
  return rateLimitAccount(accountId, action, max, windowMs);
}

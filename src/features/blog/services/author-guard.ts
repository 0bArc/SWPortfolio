import { requireActiveAccount } from "@/features/accounts/services/auth/session";
import { hasPermission, resolvePermissions } from "@/features/accounts/services/permissions/resolve";
import { jsonError } from "@/lib/network/http";

export type AuthorActor = {
  accountId: number;
  username: string;
  displayName: string;
};

export async function requireAuthorPost(): Promise<AuthorActor | Response> {
  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const perms = await resolvePermissions(auth.accountId, auth.account.username);
  if (!hasPermission(perms, "posts:write")) {
    return jsonError("Author badge required", 403);
  }

  return {
    accountId: auth.accountId,
    username: auth.account.username,
    displayName: auth.account.displayName,
  };
}

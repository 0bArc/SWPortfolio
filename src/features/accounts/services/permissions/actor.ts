import { getAccountSession, getAccountSessionId } from "@/features/accounts/services/auth/session";
import { distinctBadgeSlugs } from "@/database/accounts";
import {
  canActOnUser,
  resolvePermissions,
  type Permission,
} from "@/features/accounts/services/permissions/resolve";

export type AdminActor =
  | { kind: "full" }
  | {
      kind: "account";
      accountId: number;
      username: string;
      slugs: string[];
      perms: Set<Permission>;
    };

/** CMS action actor — site session → rank checks; env-only CMS login → full. */
export async function resolveAdminActor(): Promise<AdminActor> {
  const accountId = await getAccountSessionId();
  const session = await getAccountSession();
  if (!accountId || !session) return { kind: "full" };

  const slugs = await distinctBadgeSlugs(accountId);
  const perms = await resolvePermissions(accountId, session.username);
  return {
    kind: "account",
    accountId,
    username: session.username,
    slugs,
    perms,
  };
}

export async function assertCanActOnTarget(
  actor: AdminActor,
  targetUsername: string
): Promise<{ ok: true; targetSlugs: string[] } | { ok: false; error: string }> {
  const row = await import("@/database/accounts").then((m) =>
    m.getAccountByUsername(targetUsername.trim().toLowerCase())
  );
  if (!row) return { ok: false, error: "User not found" };

  const targetSlugs = await distinctBadgeSlugs(row.id);

  if (actor.kind === "full") {
    return { ok: true, targetSlugs };
  }

  const check = canActOnUser({
    actorUsername: actor.username,
    actorSlugs: actor.slugs,
    targetUsername: row.username,
    targetSlugs,
  });
  if (!check.ok) return check;

  return { ok: true, targetSlugs };
}

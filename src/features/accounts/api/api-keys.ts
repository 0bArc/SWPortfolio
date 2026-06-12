import type { NextRequest } from "next/server";
import { createApiKey, listApiKeysForAccount, revokeApiKey } from "@/database/api-keys";
import { dispatchSiteEvent } from "@/features/events";
import { requireVerifiedAccount } from "@/features/accounts/services/auth/session";
import { API_KEY_MGMT_LIMITS } from "@/lib/network/server/api-limits";
import { assertSameOrigin, rateLimit, rateLimitAccount } from "@/lib/network/server/security";
import { jsonError } from "@/lib/network/http";

export async function handleListApiKeys(): Promise<Response> {
  const auth = await requireVerifiedAccount();
  if (auth instanceof Response) return auth;

  const limited = rateLimitAccount(
    auth.accountId,
    "api-key-list",
    API_KEY_MGMT_LIMITS.list.max,
    API_KEY_MGMT_LIMITS.list.windowMs
  );
  if (limited) return limited;

  const keys = await listApiKeysForAccount(auth.accountId);
  return Response.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })),
  });
}

export async function handleCreateApiKey(request: NextRequest): Promise<Response> {
  const blocked =
    assertSameOrigin(request) ??
    rateLimit(request, "api-key-create", API_KEY_MGMT_LIMITS.create.max, API_KEY_MGMT_LIMITS.create.windowMs);
  if (blocked) return blocked;

  const auth = await requireVerifiedAccount();
  if (auth instanceof Response) return auth;

  const accountLimited = rateLimitAccount(
    auth.accountId,
    "api-key-create",
    API_KEY_MGMT_LIMITS.create.max,
    API_KEY_MGMT_LIMITS.create.windowMs
  );
  if (accountLimited) return accountLimited;

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await createApiKey(auth.accountId, body.name ?? "Default");
  if ("error" in result) return jsonError(result.error, 400);

  await dispatchSiteEvent({
    type: "api_key.created",
    actorAccountId: auth.accountId,
    keyId: result.key.id,
    keyName: result.key.name,
  });

  return Response.json({
    key: {
      id: result.key.id,
      name: result.key.name,
      prefix: result.key.keyPrefix,
      createdAt: result.key.createdAt,
    },
    secret: result.raw,
  });
}

export async function handleRevokeApiKey(request: NextRequest, keyId: number): Promise<Response> {
  const blocked =
    assertSameOrigin(request) ??
    rateLimit(request, "api-key-revoke", API_KEY_MGMT_LIMITS.revoke.max, API_KEY_MGMT_LIMITS.revoke.windowMs);
  if (blocked) return blocked;

  const auth = await requireVerifiedAccount();
  if (auth instanceof Response) return auth;

  const accountLimited = rateLimitAccount(
    auth.accountId,
    "api-key-revoke",
    API_KEY_MGMT_LIMITS.revoke.max,
    API_KEY_MGMT_LIMITS.revoke.windowMs
  );
  if (accountLimited) return accountLimited;

  const keys = await listApiKeysForAccount(auth.accountId);
  const target = keys.find((k) => k.id === keyId);

  const revoked = await revokeApiKey(auth.accountId, keyId);
  if (!revoked) return jsonError("Key not found", 404);

  await dispatchSiteEvent({
    type: "api_key.revoked",
    actorAccountId: auth.accountId,
    keyId,
    keyName: target?.name,
  });

  return Response.json({ ok: true });
}

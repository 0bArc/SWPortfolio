import type { NextRequest } from "next/server";
import { resolveApiKeyAccount, apiKeyPrefix } from "@/database/api-keys";
import { getAccountSessionById } from "@/database/accounts";
import { jsonError } from "@/lib/network/http";
import { API_V1_LIMITS } from "@/lib/network/server/api-limits";
import { clientIp, rateLimit, rateLimitAccount, rateLimitKeyed } from "@/lib/network/server/security";
import { logSecurityEvent } from "@/lib/security/audit";

export type ApiKeyAuth = {
  accountId: number;
  username: string;
};

function extractApiKey(request: NextRequest | Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const header = request.headers.get("x-api-key");
  return header?.trim() ?? null;
}

/** Validates Bearer / X-API-Key header — returns auth or error Response. */
export async function requireApiKey(request: NextRequest | Request): Promise<ApiKeyAuth | Response> {
  const req = request as NextRequest;
  const raw = extractApiKey(request);
  if (!raw) {
    return jsonError("Missing API key — use Authorization: Bearer <key> or X-API-Key", 401);
  }

  const { ip: ipLimit, ipInvalidKey, account: acctLimit, keyPrefix } = API_V1_LIMITS;

  const ipBlocked = rateLimit(req, "api-v1-ip", ipLimit.max, ipLimit.windowMs);
  if (ipBlocked) return ipBlocked;

  const prefix = raw.startsWith("kn_") ? apiKeyPrefix(raw) : raw.slice(0, 12);
  const prefixBlocked = rateLimitKeyed(prefix, "api-v1-key", keyPrefix.max, keyPrefix.windowMs);
  if (prefixBlocked) return prefixBlocked;

  const accountId = await resolveApiKeyAccount(raw);
  if (!accountId) {
    const failBlocked = rateLimit(req, "api-key-invalid", ipInvalidKey.max, ipInvalidKey.windowMs);
    if (failBlocked) return failBlocked;
    void logSecurityEvent({
      type: "api_key_invalid",
      ip: clientIp(req),
      meta: { prefix },
    });
    return jsonError("Invalid or revoked API key", 401);
  }

  const acctBlocked = rateLimitAccount(
    accountId,
    "api-v1",
    acctLimit.max,
    acctLimit.windowMs
  );
  if (acctBlocked) return acctBlocked;

  const session = await getAccountSessionById(accountId);
  if (!session || session.ban) {
    return jsonError("Account not allowed", 403);
  }

  return { accountId, username: session.username };
}

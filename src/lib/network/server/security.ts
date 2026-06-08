import type { NextRequest } from "next/server";

export { assertSameOrigin, rateLimit } from "@/api/lib/security";

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Per-account rate limit (server-only). */
export function rateLimitAccount(
  accountId: number,
  action: string,
  max: number,
  windowMs: number
): Response | null {
  const key = `${action}:acct:${accountId}`;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;
  if (entry.count > max) {
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  return null;
}

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

import type { NextRequest } from "next/server";

const ipBuckets = new Map<string, { count: number; resetAt: number }>();

/** Simple in-memory rate limit per IP + action. */
export function rateLimit(
  request: NextRequest,
  action: string,
  max: number,
  windowMs: number
): Response | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const key = `${action}:${ip}`;
  const now = Date.now();
  const entry = ipBuckets.get(key);

  if (!entry || now >= entry.resetAt) {
    ipBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;
  if (entry.count > max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return Response.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  return null;
}

export function assertSameOrigin(request: NextRequest): Response | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return null;
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

const accountBuckets = new Map<string, { count: number; resetAt: number }>();

/** Per-account rate limit (server-only). */
export function rateLimitAccount(
  accountId: number,
  action: string,
  max: number,
  windowMs: number
): Response | null {
  const key = `${action}:acct:${accountId}`;
  const now = Date.now();
  const entry = accountBuckets.get(key);

  if (!entry || now >= entry.resetAt) {
    accountBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;
  if (entry.count > max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return Response.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
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

const keyedBuckets = new Map<string, { count: number; resetAt: number }>();

/** Generic keyed rate limit (key prefix, account id, etc.). */
export function rateLimitKeyed(
  bucketId: string,
  action: string,
  max: number,
  windowMs: number
): Response | null {
  const key = `${action}:${bucketId}`;
  const now = Date.now();
  const entry = keyedBuckets.get(key);

  if (!entry || now >= entry.resetAt) {
    keyedBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;
  if (entry.count > max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return Response.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  return null;
}

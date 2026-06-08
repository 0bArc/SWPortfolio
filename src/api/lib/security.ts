import type { NextRequest } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

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
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;
  if (entry.count > max) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
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

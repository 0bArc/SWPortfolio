import { adminConfig } from "@api-config";
import { idleTimeoutMs } from "@/features/admin/services/session-idle";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 100 && SLUG_RE.test(slug);
}

export async function signToken(secret: string): Promise<string> {
  const ts = Date.now().toString();
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`admin:${ts}`)
  );
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${ts}.${b64}`;
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) return false;
    const ts = token.slice(0, dotIdx);
    const b64 = token.slice(dotIdx + 1);
    if (!ts || !b64) return false;

    const issued = Number(ts);
    const age = Date.now() - issued;
    if (!Number.isFinite(issued) || age > COOKIE_MAX_AGE * 1000 || age > idleTimeoutMs()) {
      return false;
    }

    const key = await getKey(secret);
    const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
    const missing = (4 - (padded.length % 4)) % 4;
    const sig = Uint8Array.from(atob(padded + "=".repeat(missing)), (c) =>
      c.charCodeAt(0)
    );
    return crypto.subtle.verify(
      "HMAC",
      key,
      sig,
      new TextEncoder().encode(`admin:${ts}`)
    );
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const session = jar.get(COOKIE_NAME);
  const secret = adminConfig.sessionSecret;
  if (!secret || !session?.value) return false;
  return verifyToken(session.value, secret);
}

/** Returns a 401 Response when unauthenticated, otherwise null. */
export async function requireAdmin(): Promise<Response | null> {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** CMS routes (posts, media, tags) — blocks moderator-only panel access. */
export async function requireAdminCms(): Promise<Response | null> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { resolveAdminActor } = await import("@/features/accounts/services/permissions/actor");
  const { canAccessAdminCms } = await import("@/features/admin/services/access");
  const actor = await resolveAdminActor();
  if (!canAccessAdminCms(actor)) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }
  return null;
}

/** Full user admin tools — not moderator-only panel access. */
export async function requireAdminUsers(): Promise<Response | null> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { resolveAdminActor } = await import("@/features/accounts/services/permissions/actor");
  const { canManageAdminUsers } = await import("@/features/admin/services/access");
  const actor = await resolveAdminActor();
  if (!canManageAdminUsers(actor)) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }
  return null;
}

export { COOKIE_NAME, COOKIE_MAX_AGE };

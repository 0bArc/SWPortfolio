const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
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

export { COOKIE_NAME, COOKIE_MAX_AGE };

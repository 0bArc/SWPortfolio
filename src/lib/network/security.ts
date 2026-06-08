/** Client-side request hardening — pair with server assertSameOrigin. */

export const NETWORK_HEADERS = {
  json: { "Content-Type": "application/json" },
} as const;

export function sameOriginCredentials(): RequestCredentials {
  return "same-origin";
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Block obviously unsafe relative URLs from user-controlled hrefs. */
export function safeInternalPath(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("://")) return null;
  return path;
}

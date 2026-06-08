import { cookies } from "next/headers";
import {
  ACCOUNT_SESSION_COOKIE,
  ACCOUNT_SESSION_MAX_AGE,
  type AccountPublic,
} from "@/db/schema";
import {
  getAccountBySessionToken,
  getAccountIdBySessionToken,
} from "@/lib/db/accounts";

export async function getAccountSession(): Promise<AccountPublic | null> {
  const jar = await cookies();
  const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return getAccountBySessionToken(raw);
}

export async function getAccountSessionId(): Promise<number | null> {
  const jar = await cookies();
  const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return getAccountIdBySessionToken(raw);
}

/** Returns 401 JSON when unauthenticated. */
export async function requireAccount(): Promise<{ account: AccountPublic; accountId: number } | Response> {
  const jar = await cookies();
  const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!raw) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const accountId = await getAccountIdBySessionToken(raw);
  const account = await getAccountBySessionToken(raw);
  if (!accountId || !account) {
    return Response.json({ error: "Session expired" }, { status: 401 });
  }
  return { account, accountId };
}

export function sessionCookieOpts(maxAge = ACCOUNT_SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

export { ACCOUNT_SESSION_COOKIE, ACCOUNT_SESSION_MAX_AGE };

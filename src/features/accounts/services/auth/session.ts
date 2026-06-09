import { cookies } from "next/headers";
import {
  ACCOUNT_SESSION_COOKIE,
  ACCOUNT_SESSION_MAX_AGE,
  type AccountSession,
} from "@/database/schema";
import {
  getAccountSessionByToken,
  getAccountIdBySessionToken,
  isEmailVerifiedForAccount,
} from "@/database/accounts";
import { emailVerificationRequired } from "@/lib/mail";
import { jsonError, jsonSuspended } from "@/lib/network/http";

export async function getAccountSession(): Promise<AccountSession | null> {
  const jar = await cookies();
  const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return await getAccountSessionByToken(raw);
  } catch {
    return null;
  }
}

export async function getAccountSessionId(): Promise<number | null> {
  const jar = await cookies();
  const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return getAccountIdBySessionToken(raw);
}

/** Returns 401 JSON when unauthenticated. Allows suspended sessions. */
export async function requireAccount(): Promise<{ account: AccountSession; accountId: number } | Response> {
  const jar = await cookies();
  const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!raw) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const accountId = await getAccountIdBySessionToken(raw);
  const account = await getAccountSessionByToken(raw);
  if (!accountId || !account) {
    return Response.json({ error: "Session expired" }, { status: 401 });
  }
  return { account, accountId };
}

/** Blocks suspended accounts — use on all mutating / protected APIs except logout & session. */
export async function requireActiveAccount(): Promise<
  { account: AccountSession; accountId: number } | Response
> {
  const auth = await requireAccount();
  if (auth instanceof Response) return auth;
  if (auth.account.ban) return jsonSuspended(auth.account.ban);
  return auth;
}

/** Blocks unverified accounts when Resend email flow is active. */
export async function requireVerifiedAccount(): Promise<
  { account: AccountSession; accountId: number } | Response
> {
  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;
  if (!emailVerificationRequired()) return auth;

  const verified = await isEmailVerifiedForAccount(auth.accountId);
  if (!verified) {
    return jsonError("Verify your email before continuing", 403);
  }
  return auth;
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

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSessionToken } from "@/database/accounts";
import { ACCOUNT_SESSION_COOKIE, sessionCookieOpts } from "@/features/accounts/services/auth/session";

export async function handleLogout(): Promise<Response> {
  const jar = await cookies();
  const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (raw) await deleteSessionToken(raw);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCOUNT_SESSION_COOKIE, "", { ...sessionCookieOpts(0), maxAge: 0 });
  return res;
}

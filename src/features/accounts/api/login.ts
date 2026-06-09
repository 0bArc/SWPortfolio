import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword } from "@/features/accounts/services/auth/password";
import { matchesAdminLogin, ensureAdminVisitorAccount } from "@/features/accounts/services/auth/admin-bridge";
import { syncBadgesForAccount } from "@/features/accounts/services/badges/service";
import {
  getAccountByUsername,
  createSessionToken,
  touchAccountIp,
  getAccountSessionById,
} from "@/database/accounts";
import { ACCOUNT_SESSION_COOKIE, sessionCookieOpts } from "@/features/accounts/services/auth/session";
import { getClientIp, jsonError } from "@/lib/network/http";
import { assertSameOrigin, rateLimit } from "@/lib/network/server/security";
import { logSecurityEvent } from "@/lib/security/audit";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function handleLogin(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "login", 10, 15 * 60 * 1000);
  if (blocked) return blocked;

  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  const username = (body.username ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const ip = getClientIp(request);

  if (!username || !password) {
    return jsonError("Username and password required", 400);
  }

  let row = await getAccountByUsername(username);
  let viaAdminBridge = false;

  if (row && (await verifyPassword(password, row.password_hash))) {
    // normal visitor login
  } else if (matchesAdminLogin(username, password)) {
    row = await ensureAdminVisitorAccount(password, ip);
    if (!row) {
      return jsonError("Could not link admin account", 500);
    }
    viaAdminBridge = true;
  } else {
    await logSecurityEvent({ type: "login_failed", ip, meta: { username } });
    return jsonError("Invalid credentials", 401);
  }

  await syncBadgesForAccount(row.id, row.username);
  await touchAccountIp(row.id, ip, {
    type: viaAdminBridge ? "admin_bridge_login" : "login",
    at: new Date().toISOString(),
    ip,
  });
  const token = await createSessionToken(row.id, ip);

  await logSecurityEvent({ type: "login_success", ip, accountId: row.id });
  const session = await getAccountSessionById(row.id);
  const res = NextResponse.json({ account: session });
  res.cookies.set(ACCOUNT_SESSION_COOKIE, token, sessionCookieOpts());
  return res;
}

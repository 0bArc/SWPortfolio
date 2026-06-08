import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword } from "@/lib/accounts/password";
import { matchesAdminLogin, ensureAdminVisitorAccount } from "@/lib/accounts/admin-bridge";
import { syncBadgesForAccount } from "@/lib/accounts/badge-service";
import { getAccountByUsername, createSessionToken, touchAccountIp } from "@/lib/db/accounts";
import { ACCOUNT_SESSION_COOKIE, sessionCookieOpts } from "@/lib/accounts/auth";
import { getClientIp, jsonError } from "@/api/lib/http";
import { assertSameOrigin, rateLimit } from "@/api/lib/security";

type LoginBody = {
  username?: string;
  password?: string;
};

function accountPayload(row: { username: string; display_name: string; icon: string | null; created_at: Date }) {
  return {
    username: row.username,
    displayName: row.display_name,
    icon: row.icon,
    createdAt: row.created_at.toISOString(),
  };
}

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
    return jsonError("Invalid credentials", 401);
  }

  await syncBadgesForAccount(row.id, row.username);
  await touchAccountIp(row.id, ip, {
    type: viaAdminBridge ? "admin_bridge_login" : "login",
    at: new Date().toISOString(),
    ip,
  });
  const token = await createSessionToken(row.id, ip);

  const res = NextResponse.json({ account: accountPayload(row) });
  res.cookies.set(ACCOUNT_SESSION_COOKIE, token, sessionCookieOpts());
  return res;
}

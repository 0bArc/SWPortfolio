import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminConfig } from "@api-config";
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE, safeEqual } from "@/features/admin/services/auth";
import { verifyPassword } from "@/features/accounts/services/auth/password";
import { getAccountByUsername } from "@/database/accounts";
import {
  canAccessAdminPanel,
  resolvePermissions,
} from "@/features/accounts/services/permissions/resolve";
import {
  ACCOUNT_SESSION_COOKIE,
  getAccountSession,
} from "@/features/accounts/services/auth/session";

async function issueAdminSession(): Promise<NextResponse> {
  const secret = adminConfig.sessionSecret.trim();
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const token = await signToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

async function tryStaffAccountLogin(
  username: string,
  password: string
): Promise<NextResponse | null> {
  const row = await getAccountByUsername(username);
  if (!row) return null;

  if (row.banned_at) {
    return NextResponse.json(
      { error: row.ban_reason?.trim() || "Account suspended" },
      { status: 403 }
    );
  }

  if (!(await verifyPassword(password, row.password_hash))) {
    return null;
  }

  const perms = await resolvePermissions(row.id, row.username);
  if (!canAccessAdminPanel(perms, row.username)) {
    return NextResponse.json(
      { error: "This account does not have admin panel access" },
      { status: 403 }
    );
  }

  return issueAdminSession();
}

/** Already signed in on site with staff perms → one-click admin session. */
export async function GET(): Promise<Response> {
  const session = await getAccountSession();
  if (!session) {
    return NextResponse.json({ canBridge: false });
  }

  const row = await getAccountByUsername(session.username);
  if (!row || row.banned_at) {
    return NextResponse.json({ canBridge: false });
  }

  const perms = await resolvePermissions(row.id, row.username);
  if (!canAccessAdminPanel(perms, row.username)) {
    return NextResponse.json({ canBridge: false });
  }

  return NextResponse.json({
    canBridge: true,
    username: session.username,
    displayName: session.displayName,
  });
}

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string; useSiteSession?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const adminUsername = adminConfig.username.trim();
  const adminPassword = adminConfig.password.trim();
  const username = (body.username ?? "").trim().toLowerCase();
  const password = (body.password ?? "").trim();

  if (!adminUsername || !adminPassword) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Bridge: signed-in site account with staff perms (no password re-entry)
  if (body.useSiteSession) {
    const jar = await cookies();
    const raw = jar.get(ACCOUNT_SESSION_COOKIE)?.value;
    if (!raw) {
      return NextResponse.json({ error: "Sign in on the site first" }, { status: 401 });
    }
    const session = await getAccountSession();
    if (!session || (username && session.username !== username)) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 401 });
    }
    const row = await getAccountByUsername(session.username);
    if (!row || row.banned_at) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }
    const perms = await resolvePermissions(row.id, row.username);
    if (!canAccessAdminPanel(perms, row.username)) {
      return NextResponse.json({ error: "No admin panel access" }, { status: 403 });
    }
    return issueAdminSession();
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  // Env admin credentials (legacy)
  if (safeEqual(username, adminUsername.toLowerCase()) && safeEqual(password, adminPassword)) {
    return issueAdminSession();
  }

  const staffLogin = await tryStaffAccountLogin(username, password);
  if (staffLogin) return staffLogin;

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

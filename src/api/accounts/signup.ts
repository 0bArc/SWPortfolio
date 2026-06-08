import { NextResponse, type NextRequest } from "next/server";
import { verifyTurnstile, captchaConfigured } from "@/lib/accounts/captcha";
import { hashPassword } from "@/lib/accounts/password";
import {
  isValidUsername,
  isValidDisplayName,
  isValidPassword,
  isValidIconUrl,
} from "@/lib/accounts/validation";
import {
  createAccount,
  createSessionToken,
  getAccountByUsername,
  usernameExists,
} from "@/lib/db/accounts";
import { ACCOUNT_SESSION_COOKIE, sessionCookieOpts } from "@/lib/accounts/auth";
import { syncBadgesForAccount } from "@/lib/accounts/badge-service";
import { getClientIp, jsonError } from "@/api/lib/http";
import { assertSameOrigin, rateLimit } from "@/api/lib/security";

type SignupBody = {
  username?: string;
  displayName?: string;
  password?: string;
  icon?: string;
  captchaToken?: string;
};

export async function handleSignup(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "signup", 5, 60 * 60 * 1000);
  if (blocked) return blocked;

  if (!captchaConfigured()) {
    return jsonError("Sign-up is not configured", 503);
  }

  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  const username = (body.username ?? "").trim().toLowerCase();
  const displayName = (body.displayName ?? "").trim();
  const password = body.password ?? "";
  const icon = body.icon?.trim() || null;
  const captchaToken = body.captchaToken ?? "";
  const ip = getClientIp(request);

  if (!isValidUsername(username)) {
    return jsonError("Username must be 3–32 chars: lowercase letters, numbers, _ or -", 400);
  }
  if (!isValidDisplayName(displayName)) {
    return jsonError("Display name required (max 64 chars)", 400);
  }
  if (!isValidPassword(password)) {
    return jsonError("Password must be 8–128 characters", 400);
  }
  if (!isValidIconUrl(icon)) {
    return jsonError("Icon must be a valid HTTPS URL", 400);
  }

  const captchaOk = await verifyTurnstile(captchaToken, ip);
  if (!captchaOk) {
    return jsonError("Captcha verification failed", 400);
  }

  if (await usernameExists(username)) {
    return jsonError("Username already taken", 409);
  }

  const passwordHash = await hashPassword(password);
  const account = await createAccount({
    username,
    displayName,
    passwordHash,
    icon,
    signupIp: ip,
  });

  const full = await getAccountByUsername(username);
  if (!full) return jsonError("Account creation failed", 500);

  await syncBadgesForAccount(full.id, full.username);
  const token = await createSessionToken(full.id, ip);
  const res = NextResponse.json({ account });
  res.cookies.set(ACCOUNT_SESSION_COOKIE, token, sessionCookieOpts());
  return res;
}

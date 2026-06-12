import { NextResponse, type NextRequest } from "next/server";
import { verifyTurnstile, captchaConfigured } from "@/features/accounts/services/auth/captcha";
import { hashPassword } from "@/features/accounts/services/auth/password";
import {
  isValidUsername,
  isValidDisplayName,
  isValidPassword,
  isValidEmail,
} from "@/features/accounts/services/validation/fields";
import {
  createAccount,
  createSessionToken,
  getAccountByUsername,
  getAccountSessionById,
  usernameExists,
} from "@/database/accounts";
import { emailExists, normalizeEmail } from "@/database/email-verification";
import { sendVerificationEmail } from "@/features/accounts/services/email";
import { ACCOUNT_SESSION_COOKIE, sessionCookieOpts } from "@/features/accounts/services/auth/session";
import { syncBadgesForAccount } from "@/features/accounts/services/badges/service";
import { getClientIp, jsonError } from "@/lib/network/http";
import { assertSameOrigin, rateLimit } from "@/lib/network/server/security";
import { emailVerificationRequired, isMailSandbox, mailConfigured, siteUrlForRequest } from "@/lib/mail";
import { deleteAccount } from "@/database/accounts";
import { dispatchSiteEvent } from "@/features/events";
import { logSecurityEvent } from "@/lib/security/audit";
import { databaseUnavailableMessage, isDatabaseConnectionError } from "@/lib/database/errors";

type SignupBody = {
  username?: string;
  displayName?: string;
  password?: string;
  email?: string;
  captchaToken?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
};

function sessionPayload(accountId: number) {
  return getAccountSessionById(accountId);
}

export async function handleSignup(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "signup", 5, 60 * 60 * 1000);
  if (blocked) return blocked;

  if (!captchaConfigured()) {
    return jsonError("Sign-up is not configured", 503);
  }

  const needsEmail = emailVerificationRequired();

  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  const username = (body.username ?? "").trim().toLowerCase();
  const displayName = (body.displayName ?? "").trim();
  const password = body.password ?? "";
  const email = body.email?.trim() ?? "";
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
  if (needsEmail) {
    if (!isValidEmail(email)) {
      return jsonError("Valid email required", 400);
    }
    if (!mailConfigured()) {
      return jsonError("Email verification is not configured", 503);
    }
  }

  if (body.acceptedTerms !== true || body.acceptedPrivacy !== true) {
    return jsonError("You must accept the Terms of Service and Privacy Policy", 400);
  }

  const captchaOk = await verifyTurnstile(captchaToken, ip);
  if (!captchaOk) {
    return jsonError("Captcha verification failed", 400);
  }

  const legalAcceptedAt = new Date();

  try {
    if (await usernameExists(username)) {
      return jsonError("Username already taken", 409);
    }
    if (needsEmail && (await emailExists(email))) {
      return jsonError("Email already registered", 409);
    }
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      return jsonError(databaseUnavailableMessage(), 503);
    }
    throw err;
  }

  const passwordHash = await hashPassword(password);

  try {
  const account = await createAccount({
    username,
    displayName,
    passwordHash,
    signupIp: ip,
    email: needsEmail ? normalizeEmail(email) : null,
    emailVerified: !needsEmail,
    termsAcceptedAt: legalAcceptedAt,
    privacyAcceptedAt: legalAcceptedAt,
  });

  const full = await getAccountByUsername(username);
  if (!full) return jsonError("Account creation failed", 500);

  await syncBadgesForAccount(full.id, full.username);
  await dispatchSiteEvent({
    type: "account.created",
    actorAccountId: full.id,
    username: full.username,
    displayName: full.display_name,
    emailVerificationRequired: needsEmail,
  });
  await logSecurityEvent({ type: "signup", ip, accountId: full.id, meta: { username } });

  if (needsEmail) {
    const mailed = await sendVerificationEmail(
      full.id,
      full.username,
      normalizeEmail(email),
      siteUrlForRequest(request)
    );
    if (!mailed.ok) {
      await deleteAccount(full.id);
      const devHint =
        process.env.DEV_MODE === "true" || process.env.NODE_ENV === "development"
          ? mailed.error
          : "Could not send verification email. Try again later.";
      const sandboxHint = isMailSandbox()
        ? " (Resend sandbox: use your Resend account email as signup address)"
        : "";
      return jsonError(`${devHint}${sandboxHint}`, 503);
    }

    const session = await sessionPayload(full.id);
    return NextResponse.json({
      account: session,
      emailVerificationRequired: true,
    });
  }

  const token = await createSessionToken(full.id, ip);
  const session = await sessionPayload(full.id);
  const res = NextResponse.json({ account: session ?? account });
  res.cookies.set(ACCOUNT_SESSION_COOKIE, token, sessionCookieOpts());
  return res;
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      return jsonError(databaseUnavailableMessage(), 503);
    }
    throw err;
  }
}

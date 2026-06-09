import type { NextRequest } from "next/server";
import { requireActiveAccount } from "@/features/accounts/services/auth/session";
import { resendVerificationEmail } from "@/features/accounts/services/email";
import { isAccountEmailVerified } from "@/database/email-verification";
import { jsonError } from "@/lib/network/http";
import { assertSameOrigin, rateLimit, rateLimitAccount } from "@/lib/network/server/security";
import { isMailSandbox, mailConfigured, siteUrlForRequest } from "@/lib/mail";

export async function handleResendVerification(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "resend-verification", 10, 60 * 60 * 1000);
  if (blocked) return blocked;

  if (!mailConfigured()) {
    return jsonError("Email verification is not configured", 503);
  }

  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const accountLimited = rateLimitAccount(auth.accountId, "resend-verification", 3, 60 * 60 * 1000);
  if (accountLimited) return accountLimited;

  if (await isAccountEmailVerified(auth.accountId)) {
    return jsonError("Email already verified", 400);
  }

  const result = await resendVerificationEmail(
    auth.accountId,
    auth.account.username,
    siteUrlForRequest(request)
  );
  if (!result.ok) {
    const sandboxHint = isMailSandbox()
      ? " Resend sandbox only delivers to your Resend account email."
      : "";
    return jsonError(`${result.error}${sandboxHint}`, 503);
  }

  return Response.json({ ok: true });
}

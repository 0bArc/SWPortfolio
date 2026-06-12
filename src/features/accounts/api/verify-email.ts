import type { NextRequest } from "next/server";
import { verifyEmailByToken } from "@/features/accounts/services/email";
import { getClientIp, jsonError } from "@/lib/network/http";
import { rateLimit } from "@/lib/network/server/security";
import { logSecurityEvent } from "@/lib/security/audit";
import { dispatchSiteEvent } from "@/features/events";

export async function handleVerifyEmail(request: NextRequest): Promise<Response> {
  const blocked = rateLimit(request, "verify-email", 20, 15 * 60 * 1000);
  if (blocked) return blocked;

  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return jsonError("Verification token required", 400);
  }

  const ip = getClientIp(request);
  const result = await verifyEmailByToken(token);
  if (!result) {
    await logSecurityEvent({ type: "email_verify_failed", ip });
    return jsonError("Invalid or expired verification link", 400);
  }

  await dispatchSiteEvent({
    type: "user.email_verified",
    actorAccountId: null,
    targetAccountId: result.accountId,
    username: result.username,
    byStaff: false,
  });
  await dispatchSiteEvent({
    type: "session.updated",
    targetAccountId: result.accountId,
  });

  await logSecurityEvent({
    type: "email_verify_success",
    ip,
    meta: { username: result.username },
  });
  return Response.json({ ok: true, username: result.username });
}

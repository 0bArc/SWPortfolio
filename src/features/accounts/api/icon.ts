import type { NextRequest } from "next/server";
import { requireVerifiedAccount } from "@/features/accounts/services/auth/session";
import { saveBlogImage } from "@/features/blog/services/images";
import {
  clearAccountIcons,
  getAccountSessionById,
  submitAccountIconPending,
} from "@/database/accounts";
import { assertSameOrigin, rateLimit } from "@/lib/network/server/security";
import { jsonError } from "@/lib/network/http";
import { publishAccountEvent, publishAdminEvent } from "@/lib/network/server/events";

export async function handleUploadIcon(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "icon-upload", 10, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireVerifiedAccount();
  if (auth instanceof Response) return auth;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing file", 400);
  }

  const mime = file.type || "application/octet-stream";
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const { url } = await saveBlogImage(buf, mime);
    await submitAccountIconPending(auth.accountId, url);
    publishAdminEvent({ type: "refresh", channel: "admin-icons" });
    publishAccountEvent(auth.accountId, { type: "refresh", channel: "profile" });
    const session = await getAccountSessionById(auth.accountId);
    return Response.json({
      icon: session?.icon ?? null,
      iconPending: url,
      pendingReview: true,
      message: "Photo submitted for review",
      account: session,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return jsonError(msg, 400);
  }
}

export async function handleRemoveIcon(): Promise<Response> {
  const auth = await requireVerifiedAccount();
  if (auth instanceof Response) return auth;

  await clearAccountIcons(auth.accountId);
  publishAccountEvent(auth.accountId, { type: "refresh", channel: "profile" });
  publishAccountEvent(auth.accountId, { type: "refresh", channel: "session" });
  const session = await getAccountSessionById(auth.accountId);
  return Response.json({
    icon: null,
    iconPending: null,
    pendingReview: false,
    account: session,
  });
}

import type { NextRequest } from "next/server";
import {
  approveAccountIcon,
  countPendingIconAccounts,
  getAccountByUsername,
  listPendingIconAccounts,
  PENDING_ICONS_PAGE_SIZE,
  rejectAccountIcon,
} from "@/database/accounts";
import { publishAccountEvent, publishAdminEvent } from "@/lib/network/server/events";
import { jsonError } from "@/lib/network/http";

export async function handleListPendingIcons(request: NextRequest): Promise<Response> {
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const [pending, total] = await Promise.all([
    listPendingIconAccounts(page, PENDING_ICONS_PAGE_SIZE),
    countPendingIconAccounts(),
  ]);
  return Response.json({
    pending,
    total,
    page,
    pageSize: PENDING_ICONS_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PENDING_ICONS_PAGE_SIZE)),
  });
}

export async function handleReviewIcon(
  request: NextRequest,
  username: string
): Promise<Response> {
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  const action = body.action?.trim().toLowerCase();
  if (action !== "approve" && action !== "reject") {
    return jsonError("action must be approve or reject", 400);
  }

  const row = await getAccountByUsername(username.trim().toLowerCase());
  if (!row) return jsonError("User not found", 404);

  const ok =
    action === "approve"
      ? await approveAccountIcon(row.id)
      : await rejectAccountIcon(row.id);

  if (!ok) return jsonError("No pending photo for this user", 400);

  publishAdminEvent({ type: "refresh", channel: "admin-icons" });
  publishAccountEvent(row.id, { type: "refresh", channel: "session" });
  publishAccountEvent(row.id, { type: "refresh", channel: "profile" });

  return Response.json({ ok: true, action });
}

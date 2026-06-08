import type { NextRequest } from "next/server";
import { requireAccount } from "@/lib/accounts/auth";
import { getAccountIdByUsername } from "@/lib/db/accounts";
import {
  countUnreadNotifications,
  listNotificationsForAccount,
  markNotificationsRead,
  suppressNotificationsFrom,
  unsuppressNotificationsFrom,
} from "@/lib/db/notifications";
import { guardAccountMutation, guardMutation } from "@/lib/network/server/guards";
import { jsonError } from "@/api/lib/http";

function splitNotifications(items: Awaited<ReturnType<typeof listNotificationsForAccount>>) {
  const important = items.filter((n) => !n.read);
  const more = items.filter((n) => n.read);
  return { important, more };
}

export async function handleGetNotifications(): Promise<Response> {
  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  const items = await listNotificationsForAccount(auth.accountId);
  const unreadCount = await countUnreadNotifications(auth.accountId);
  const { important, more } = splitNotifications(items);

  return Response.json({ important, more, unreadCount });
}

export async function handlePatchNotifications(request: NextRequest): Promise<Response> {
  const blocked = guardMutation(request, "notifications-read", 80, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  const limited = guardAccountMutation(auth.accountId, "notifications-read", 120, 60 * 60 * 1000);
  if (limited) return limited;

  let body: { ids?: number[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  if (body.all) {
    await markNotificationsRead(auth.accountId);
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    const ids = body.ids.filter((id) => Number.isInteger(id) && id > 0);
    await markNotificationsRead(auth.accountId, ids);
  } else {
    return jsonError("No valid fields", 400);
  }

  const unreadCount = await countUnreadNotifications(auth.accountId);
  return Response.json({ ok: true, unreadCount });
}

export async function handlePostSuppress(request: NextRequest): Promise<Response> {
  const blocked = guardMutation(request, "notifications-suppress", 30, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  const username = body.username?.trim().toLowerCase();
  if (!username) return jsonError("Username required", 400);
  if (username === auth.account.username) return jsonError("Cannot suppress yourself", 400);

  const targetId = await getAccountIdByUsername(username);
  if (!targetId) return jsonError("User not found", 404);

  await suppressNotificationsFrom(auth.accountId, targetId);
  return Response.json({ ok: true });
}

export async function handleDeleteSuppress(username: string): Promise<Response> {
  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  const normalized = username.trim().toLowerCase();
  const targetId = await getAccountIdByUsername(normalized);
  if (!targetId) return jsonError("User not found", 404);

  await unsuppressNotificationsFrom(auth.accountId, targetId);
  return Response.json({ ok: true });
}

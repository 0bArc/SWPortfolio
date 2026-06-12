import type { NextRequest } from "next/server";
import {
  adminForceVerifyEmail,
  adminListUnverifiedUsers,
  adminModerateUser,
} from "@/features/accounts/services/admin/manager";
import { jsonError } from "@/lib/network/http";

export async function handleListUnverifiedUsers(): Promise<Response> {
  const users = await adminListUnverifiedUsers();
  return Response.json({ users, total: users.length });
}

export async function handleForceVerifyEmail(username: string): Promise<Response> {
  const result = await adminForceVerifyEmail(username);
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json(result.data);
}

export async function handleModerateUser(
  request: NextRequest,
  username: string
): Promise<Response> {
  let body: {
    type?: string;
    displayName?: string;
    bio?: string;
    message?: string;
    reason?: string;
    banUntil?: string | null;
    notify?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const type = body.type?.trim();
  if (
    type !== "force_name" &&
    type !== "force_bio" &&
    type !== "warn" &&
    type !== "ban" &&
    type !== "unban"
  ) {
    return jsonError("Invalid moderation type", 400);
  }

  const result = await adminModerateUser(username, {
    type,
    displayName: body.displayName,
    bio: body.bio,
    message: body.message,
    reason: body.reason,
    banUntil: body.banUntil,
    notify: body.notify,
  });
  if (!result.ok) return jsonError(result.error, result.status);

  return Response.json(result.data);
}

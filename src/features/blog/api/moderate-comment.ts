import type { NextRequest } from "next/server";
import {
  moderateComment,
  type CommentModerationStatus,
} from "@/database/comments";
import { dispatchSiteEvent, type CommentModerationAction } from "@/features/events";
import { guardMutation, requireModerator } from "@/lib/network/server/guards";
import { jsonError } from "@/lib/network/http";

const ACTION_TO_STATUS: Record<CommentModerationAction, CommentModerationStatus> = {
  approve: "approved",
  hide: "hidden",
  remove: "removed",
  restore: "approved",
};

export async function handleModerateComment(
  request: NextRequest,
  commentId: number
): Promise<Response> {
  const blocked = guardMutation(request, "comment-moderate", 80, 60 * 60 * 1000);
  if (blocked) return blocked;

  if (!Number.isInteger(commentId) || commentId < 1) {
    return jsonError("Invalid comment", 400);
  }

  const mod = await requireModerator(request);
  if (mod instanceof Response) return mod;

  let body: { action?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const action = body.action?.trim().toLowerCase() as CommentModerationAction;
  if (!action || !ACTION_TO_STATUS[action]) {
    return jsonError("action must be approve, hide, remove, or restore", 400);
  }

  const actorAccountId = mod.kind === "account" ? mod.accountId : null;

  const result = await moderateComment({
    commentId,
    moderatorAccountId: actorAccountId,
    status: ACTION_TO_STATUS[action],
    reason: body.reason?.trim() || null,
  });
  if (!result) return jsonError("Comment not found", 404);

  await dispatchSiteEvent({
    type: "comment.moderated",
    actorAccountId,
    commentId,
    postSlug: result.postSlug,
    action,
    targetAccountId: result.accountId,
    reason: body.reason?.trim() || null,
  });

  return Response.json({ ok: true, action, status: result.status });
}

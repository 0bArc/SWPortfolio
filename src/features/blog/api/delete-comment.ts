import type { NextRequest } from "next/server";
import { moderateComment } from "@/database/comments";
import { dispatchSiteEvent } from "@/features/events";
import { guardMutation, requireModerator } from "@/lib/network/server/guards";
import { jsonError } from "@/lib/network/http";

export async function handleDeleteComment(
  request: NextRequest,
  commentId: number
): Promise<Response> {
  const blocked = guardMutation(request, "comment-delete", 60, 60 * 60 * 1000);
  if (blocked) return blocked;

  if (!Number.isInteger(commentId) || commentId < 1) {
    return jsonError("Invalid comment", 400);
  }

  const mod = await requireModerator(request);
  if (mod instanceof Response) return mod;

  const actorAccountId = mod.kind === "account" ? mod.accountId : null;

  const result = await moderateComment({
    commentId,
    moderatorAccountId: actorAccountId,
    status: "removed",
  });
  if (!result) return jsonError("Comment not found", 404);

  await dispatchSiteEvent({
    type: "comment.moderated",
    actorAccountId,
    commentId,
    postSlug: result.postSlug,
    action: "remove",
    targetAccountId: result.accountId,
  });

  return Response.json({ ok: true });
}

import type { NextRequest } from "next/server";
import { deleteComment } from "@/database/comments";
import { guardMutation, requireModerator } from "@/lib/network/server/guards";
import { jsonError } from "@/lib/network/http";
import { publishBroadcastEvent } from "@/lib/network/server/events";

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

  const postSlug = await deleteComment(commentId);
  if (!postSlug) return jsonError("Comment not found", 404);

  publishBroadcastEvent({
    type: "refresh",
    channel: "comments",
    data: { postSlug },
  });

  return Response.json({ ok: true });
}

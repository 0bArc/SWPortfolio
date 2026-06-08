import type { NextRequest } from "next/server";
import { deleteComment } from "@/lib/db/comments";
import { guardMutation, requireModerator } from "@/lib/network/server/guards";
import { jsonError } from "@/api/lib/http";

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

  const deleted = await deleteComment(commentId);
  if (!deleted) return jsonError("Comment not found", 404);

  return Response.json({ ok: true });
}

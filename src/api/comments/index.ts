import type { NextRequest } from "next/server";
import { requireAccount } from "@/lib/accounts/auth";
import { syncBadgesForAccount } from "@/lib/accounts/badge-service";
import { appendActivity } from "@/lib/db/accounts";
import { createNotification } from "@/lib/db/notifications";
import { getCommentById, listCommentsForPost, createComment } from "@/lib/db/comments";
import { guardMutation, guardAccountMutation } from "@/lib/network/server/guards";
import { getPublishedPost } from "@/lib/blog/posts";
import { jsonError } from "@/api/lib/http";

const MAX_COMMENT_LEN = 2000;

export async function handleGetComments(postSlug: string): Promise<Response> {
  const post = await getPublishedPost(postSlug);
  if (!post) return jsonError("Post not found", 404);
  const comments = await listCommentsForPost(postSlug);
  return Response.json({ comments });
}

export async function handlePostComment(request: NextRequest, postSlug: string): Promise<Response> {
  const blocked = guardMutation(request, "comment-post", 40, 60 * 60 * 1000);
  if (blocked) return blocked;

  const post = await getPublishedPost(postSlug);
  if (!post) return jsonError("Post not found", 404);

  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  const limited = guardAccountMutation(auth.accountId, "comment-post", 80, 60 * 60 * 1000);
  if (limited) return limited;

  let body: { content?: string; parentId?: number | null };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  const content = (body.content ?? "").trim();
  if (!content) return jsonError("Comment cannot be empty", 400);
  if (content.length > MAX_COMMENT_LEN) {
    return jsonError(`Comment too long (max ${MAX_COMMENT_LEN})`, 400);
  }

  let parentId: number | null = null;
  if (body.parentId != null) {
    const pid = Number(body.parentId);
    if (!Number.isInteger(pid) || pid < 1) return jsonError("Invalid parent comment", 400);
    const parent = await getCommentById(pid, postSlug);
    if (!parent) return jsonError("Parent comment not found", 404);
    parentId = pid;
  }

  let comment;
  try {
    comment = await createComment({
      postSlug,
      accountId: auth.accountId,
      content,
      parentId,
    });
  } catch {
    return jsonError("Could not post comment", 400);
  }

  if (parentId) {
    const parent = await getCommentById(parentId, postSlug);
    if (parent && parent.account_id !== auth.accountId) {
      await createNotification({
        accountId: parent.account_id,
        actorAccountId: auth.accountId,
        type: "comment_reply",
        postSlug,
        commentId: comment.id,
        message: `${auth.account.displayName} replied to your comment`,
      });
    }
  }

  await appendActivity(auth.accountId, {
    type: "comment",
    at: new Date().toISOString(),
    meta: { postSlug, parentId: parentId ?? undefined },
  });
  await syncBadgesForAccount(auth.accountId, auth.account.username);

  return Response.json({ comment }, { status: 201 });
}

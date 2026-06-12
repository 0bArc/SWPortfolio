import type { NextRequest } from "next/server";
import { getAccountSessionById } from "@/database/accounts";
import { listCommentsForPost } from "@/database/comments";
import { getPublishedPost, listPublishedPosts } from "@/features/blog/services/posts";
import { requireApiKey } from "@/lib/network/server/api-key";
import { jsonError } from "@/lib/network/http";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/i;

export async function handleV1Me(request: NextRequest): Promise<Response> {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  const account = await getAccountSessionById(auth.accountId);
  if (!account) return jsonError("Account not found", 404);

  return Response.json({
    username: account.username,
    displayName: account.displayName,
    joinedAt: account.createdAt,
  });
}

export async function handleV1Posts(request: NextRequest): Promise<Response> {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  const posts = await listPublishedPosts();
  return Response.json({
    posts: posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      tags: p.tags,
      author: p.author,
      authorUsername: p.authorUsername ?? null,
      date: p.date,
      readingTime: p.readingTime,
    })),
  });
}

export async function handleV1Post(request: NextRequest, slug: string): Promise<Response> {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  if (!SLUG_RE.test(slug)) return jsonError("Invalid slug", 400);

  const post = await getPublishedPost(slug);
  if (!post) return jsonError("Post not found", 404);

  return Response.json({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    tags: post.tags,
    author: post.author,
    authorUsername: post.authorUsername ?? null,
    date: post.date,
    readingTime: post.readingTime,
  });
}

export async function handleV1Comments(request: NextRequest, postSlug: string): Promise<Response> {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  if (!SLUG_RE.test(postSlug)) return jsonError("Invalid slug", 400);

  const post = await getPublishedPost(postSlug);
  if (!post) return jsonError("Post not found", 404);

  const comments = await listCommentsForPost(postSlug);
  return Response.json({ postSlug, comments });
}

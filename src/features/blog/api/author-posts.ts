import type { NextRequest } from "next/server";
import { isValidSlug } from "@/features/admin/services/auth";
import { hasPermission, resolvePermissions } from "@/features/accounts/services/permissions/resolve";
import { requireAuthorPost, type AuthorActor } from "@/features/blog/services/author-guard";
import {
  listPostAuthorCandidates,
  parsePostAccountId,
  resolvePostAuthorAccount,
} from "@/features/blog/services/post-authors";
import {
  createPost,
  deletePost,
  getPost,
  listPostsByAccount,
  postOwnedByAccount,
  updatePost,
} from "@/features/blog/services/posts";
import { sanitizeMarkdownContent } from "@/lib/markdown/urls";
import { jsonError } from "@/lib/network/http";

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

async function actorCanPickAuthors(actor: AuthorActor): Promise<boolean> {
  const perms = await resolvePermissions(actor.accountId, actor.username);
  return hasPermission(perms, "admin:panel");
}

async function resolveAuthorFromBody(
  actor: AuthorActor,
  body: Record<string, unknown>
): Promise<{ author: string; accountId: number } | Response> {
  const accountId = parsePostAccountId(body.accountId);
  if (!accountId) {
    return jsonError("Pick an author with Author badge or Admin+ staff role", 400);
  }

  const canPick = await actorCanPickAuthors(actor);
  if (!canPick && accountId !== actor.accountId) {
    return jsonError("Cannot assign another author", 403);
  }

  const account = await resolvePostAuthorAccount(accountId);
  if (!account) {
    return jsonError("Selected user cannot be post author", 400);
  }

  return { author: account.displayName, accountId: account.id };
}

export async function handleAuthorListAuthors(): Promise<Response> {
  const actor = await requireAuthorPost();
  if (actor instanceof Response) return actor;

  try {
    if (await actorCanPickAuthors(actor)) {
      const authors = await listPostAuthorCandidates();
      return Response.json(authors);
    }

    const self = await resolvePostAuthorAccount(actor.accountId);
    return Response.json(self ? [self] : []);
  } catch (err) {
    console.error("author listPostAuthorCandidates error:", err);
    return jsonError("Database error", 500);
  }
}

export async function handleAuthorListPosts(): Promise<Response> {
  const actor = await requireAuthorPost();
  if (actor instanceof Response) return actor;
  const posts = await listPostsByAccount(actor.accountId);
  return Response.json(posts);
}

export async function handleAuthorCreatePost(request: NextRequest): Promise<Response> {
  const actor = await requireAuthorPost();
  if (actor instanceof Response) return actor;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const { slug, title, excerpt, content, featuredImage, tags, status, date } = body;
  if (!slug || !title || !date) {
    return jsonError("Missing required fields: slug, title, date", 400);
  }

  const slugStr = String(slug);
  if (!isValidSlug(slugStr)) {
    return jsonError("Invalid slug — use lowercase letters, numbers, and hyphens", 400);
  }

  const authorFields = await resolveAuthorFromBody(actor, body);
  if (authorFields instanceof Response) return authorFields;

  try {
    const post = await createPost({
      slug: slugStr,
      title: String(title),
      excerpt: excerpt ? String(excerpt) : "",
      content: content ? sanitizeMarkdownContent(String(content)) : "",
      featuredImage: featuredImage ? String(featuredImage) : null,
      tags: parseTags(tags),
      author: authorFields.author,
      accountId: authorFields.accountId,
      status: status === "published" ? "published" : "draft",
      date: String(date),
    });
    return Response.json(post, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return jsonError("Slug already exists", 409);
    }
    console.error("author createPost error:", err);
    return jsonError("Database error", 500);
  }
}

export async function handleAuthorGetPost(slug: string): Promise<Response> {
  const actor = await requireAuthorPost();
  if (actor instanceof Response) return actor;

  const post = await getPost(slug);
  if (!post || !postOwnedByAccount(post, actor.accountId)) {
    return jsonError("Post not found", 404);
  }
  return Response.json(post);
}

export async function handleAuthorUpdatePost(
  request: NextRequest,
  slug: string
): Promise<Response> {
  const actor = await requireAuthorPost();
  if (actor instanceof Response) return actor;

  const existing = await getPost(slug);
  if (!existing || !postOwnedByAccount(existing, actor.accountId)) {
    return jsonError("Post not found", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (body.slug !== undefined) {
    const next = String(body.slug);
    if (!isValidSlug(next)) {
      return jsonError("Invalid slug", 400);
    }
  }

  const content =
    body.content !== undefined ? sanitizeMarkdownContent(String(body.content)) : undefined;

  let authorUpdate: { author: string; accountId: number } | undefined;
  if (body.accountId !== undefined) {
    const resolved = await resolveAuthorFromBody(actor, body);
    if (resolved instanceof Response) return resolved;
    authorUpdate = resolved;
  }

  const updated = await updatePost(slug, {
    slug: body.slug !== undefined ? String(body.slug) : undefined,
    title: body.title !== undefined ? String(body.title) : undefined,
    excerpt: body.excerpt !== undefined ? String(body.excerpt) : undefined,
    content,
    featuredImage:
      body.featuredImage !== undefined
        ? body.featuredImage
          ? String(body.featuredImage)
          : null
        : undefined,
    tags: body.tags !== undefined ? parseTags(body.tags) : undefined,
    ...(authorUpdate && { author: authorUpdate.author, accountId: authorUpdate.accountId }),
    status: body.status === "published" ? "published" : body.status === "draft" ? "draft" : undefined,
    date: body.date !== undefined ? String(body.date) : undefined,
  });

  if (!updated) return jsonError("Update failed", 500);
  return Response.json(updated);
}

export async function handleAuthorDeletePost(slug: string): Promise<Response> {
  const actor = await requireAuthorPost();
  if (actor instanceof Response) return actor;

  const existing = await getPost(slug);
  if (!existing || !postOwnedByAccount(existing, actor.accountId)) {
    return jsonError("Post not found", 404);
  }

  await deletePost(slug);
  return Response.json({ ok: true });
}

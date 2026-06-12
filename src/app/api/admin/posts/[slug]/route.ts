import { type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isValidSlug, requireAdminCms } from "@/features/admin/services/auth";
import { getPost, updatePost, deletePost } from "@/features/blog/services/posts";
import {
  parsePostAccountId,
  resolvePostAuthorAccount,
} from "@/features/blog/services/post-authors";
import { sanitizeMarkdownContent } from "@/lib/markdown/urls";

type Ctx = { params: Promise<{ slug: string }> };

function parseTags(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminCms();
  if (denied) return denied;
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const post = await getPost(slug);
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(post);
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const denied = await requireAdminCms();
  if (denied) return denied;
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, excerpt, content, featuredImage, tags, status, date, slug: newSlug } = body;

  if (newSlug !== undefined && !isValidSlug(String(newSlug))) {
    return Response.json({ error: "Invalid slug — use lowercase letters, numbers, and hyphens" }, { status: 400 });
  }

  let authorUpdate: { author: string; accountId: number } | undefined;
  if (body.accountId !== undefined) {
    const accountId = parsePostAccountId(body.accountId);
    if (!accountId) {
      return Response.json({ error: "Pick an author account" }, { status: 400 });
    }
    const account = await resolvePostAuthorAccount(accountId);
    if (!account) {
      return Response.json({ error: "Selected user cannot be post author" }, { status: 400 });
    }
    authorUpdate = { author: account.displayName, accountId: account.id };
  }

  try {
    const post = await updatePost(slug, {
      ...(title     !== undefined && { title:   String(title) }),
      ...(excerpt   !== undefined && { excerpt: String(excerpt) }),
      ...(featuredImage !== undefined && {
        featuredImage: featuredImage ? String(featuredImage) : null,
      }),
      ...(content   !== undefined && { content: sanitizeMarkdownContent(String(content)) }),
      ...(authorUpdate && { author: authorUpdate.author, accountId: authorUpdate.accountId }),
      ...(status    !== undefined && { status:  status === "published" ? "published" : "draft" }),
      ...(date      !== undefined && { date:    String(date) }),
      ...(newSlug   !== undefined && { slug:    String(newSlug) }),
      tags: parseTags(tags),
    });
    if (!post) return Response.json({ error: "Not found" }, { status: 404 });
    revalidatePath("/blog");
    revalidatePath("/admin/posts");
    revalidatePath(`/admin/posts/${slug}`);
    return Response.json(post);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return Response.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("updatePost error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminCms();
  if (denied) return denied;
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const deleted = await deletePost(slug);
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${slug}`);
  return new Response(null, { status: 204 });
}

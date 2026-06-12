import { type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin, isValidSlug } from "@/features/admin/services/auth";
import {
  parsePostAccountId,
  resolvePostAuthorAccount,
} from "@/features/blog/services/post-authors";
import { listPosts, createPost } from "@/features/blog/services/posts";
import { sanitizeMarkdownContent } from "@/lib/markdown/urls";

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

async function resolveAuthorFromBody(body: Record<string, unknown>) {
  const accountId = parsePostAccountId(body.accountId);
  if (!accountId) {
    return Response.json(
      { error: "Pick an author with Author badge or Admin+ staff role" },
      { status: 400 }
    );
  }

  const account = await resolvePostAuthorAccount(accountId);
  if (!account) {
    return Response.json(
      { error: "Selected user cannot be post author" },
      { status: 400 }
    );
  }

  return { author: account.displayName, accountId: account.id };
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const posts = await listPosts();
  return Response.json(posts);
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, title, excerpt, content, featuredImage, tags, status, date } = body;
  if (!slug || !title || !date) {
    return Response.json({ error: "Missing required fields: slug, title, date" }, { status: 400 });
  }

  const slugStr = String(slug);
  if (!isValidSlug(slugStr)) {
    return Response.json({ error: "Invalid slug — use lowercase letters, numbers, and hyphens" }, { status: 400 });
  }

  const authorFields = await resolveAuthorFromBody(body);
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
    revalidatePath("/blog");
    revalidatePath("/admin/posts");
    return Response.json(post, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return Response.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("createPost error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

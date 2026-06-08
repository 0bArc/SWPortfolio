import { type NextRequest } from "next/server";
import { requireAdmin, isValidSlug } from "@/lib/admin-auth";
import { listPosts, createPost } from "@/lib/posts";
import { sanitizeMarkdownContent } from "@/lib/markdown-urls";

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
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

  const { slug, title, excerpt, content, featuredImage, tags, author, status, date } = body;
  if (!slug || !title || !date) {
    return Response.json({ error: "Missing required fields: slug, title, date" }, { status: 400 });
  }

  const slugStr = String(slug);
  if (!isValidSlug(slugStr)) {
    return Response.json({ error: "Invalid slug — use lowercase letters, numbers, and hyphens" }, { status: 400 });
  }

  try {
    const post = await createPost({
      slug: slugStr,
      title: String(title),
      excerpt: excerpt ? String(excerpt) : "",
      content: content ? sanitizeMarkdownContent(String(content)) : "",
      featuredImage: featuredImage ? String(featuredImage) : null,
      tags: parseTags(tags),
      author: author ? String(author) : "Sander Kristiansen",
      status: status === "published" ? "published" : "draft",
      date: String(date),
    });
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

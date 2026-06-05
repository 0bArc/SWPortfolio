import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/admin-auth";
import { listPosts, createPost } from "@/lib/posts";

async function isAuth(): Promise<boolean> {
  const jar = await cookies();
  const session = jar.get(COOKIE_NAME);
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !session) return false;
  return verifyToken(session.value, secret);
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

export async function GET() {
  if (!(await isAuth())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const posts = await listPosts();
  return Response.json(posts);
}

export async function POST(request: NextRequest) {
  if (!(await isAuth())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, title, excerpt, content, tags, author, status, date } = body;
  if (!slug || !title || !date) {
    return Response.json({ error: "Missing required fields: slug, title, date" }, { status: 400 });
  }

  try {
    const post = await createPost({
      slug: String(slug),
      title: String(title),
      excerpt: excerpt ? String(excerpt) : "",
      content: content ? String(content) : "",
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

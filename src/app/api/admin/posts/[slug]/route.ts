import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/admin-auth";
import { getPost, updatePost, deletePost } from "@/lib/posts";

type Ctx = { params: Promise<{ slug: string }> };

async function isAuth(): Promise<boolean> {
  const jar = await cookies();
  const session = jar.get(COOKIE_NAME);
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !session) return false;
  return verifyToken(session.value, secret);
}

function parseTags(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await isAuth())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(post);
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  if (!(await isAuth())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, excerpt, content, tags, author, status, date, slug: newSlug } = body;

  try {
    const post = await updatePost(slug, {
      ...(title     !== undefined && { title:   String(title) }),
      ...(excerpt   !== undefined && { excerpt: String(excerpt) }),
      ...(content   !== undefined && { content: String(content) }),
      ...(author    !== undefined && { author:  String(author) }),
      ...(status    !== undefined && { status:  status === "published" ? "published" : "draft" }),
      ...(date      !== undefined && { date:    String(date) }),
      ...(newSlug   !== undefined && { slug:    String(newSlug) }),
      tags: parseTags(tags),
    });
    if (!post) return Response.json({ error: "Not found" }, { status: 404 });
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
  if (!(await isAuth())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const deleted = await deletePost(slug);
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}

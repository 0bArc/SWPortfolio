import { type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin, isValidSlug } from "@/features/admin/services/auth";
import { getTagStyle, parseTagStyleConfig, upsertTagStyle, deleteTagStyle } from "@/lib/tags/styles";

interface RouteCtx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const record = await getTagStyle(slug);
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(record);
}

export async function PUT(request: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = parseTagStyleConfig(body.config);
  if (!config) {
    return Response.json({ error: "Invalid style config" }, { status: 400 });
  }

  try {
    const record = await upsertTagStyle(slug, config);
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    return Response.json(record);
  } catch (err) {
    console.error("upsertTagStyle error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const ok = await deleteTagStyle(slug);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });

  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  return Response.json({ ok: true });
}

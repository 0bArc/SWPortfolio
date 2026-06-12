import { type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isValidSlug, requireAdminCms } from "@/features/admin/services/auth";
import { listTagStyles, parseTagStyleConfig, upsertTagStyle } from "@/lib/tags/styles";

export async function GET() {
  const denied = await requireAdminCms();
  if (denied) return denied;
  try {
    const styles = await listTagStyles();
    return Response.json(styles);
  } catch (err) {
    console.error("listTagStyles error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdminCms();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim().toLowerCase();
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug — lowercase letters, numbers, hyphens" }, { status: 400 });
  }

  const config = parseTagStyleConfig(body.config);
  if (!config) {
    return Response.json({ error: "Invalid style config" }, { status: 400 });
  }

  try {
    const record = await upsertTagStyle(slug, config);
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    return Response.json(record, { status: 201 });
  } catch (err) {
    console.error("upsertTagStyle error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

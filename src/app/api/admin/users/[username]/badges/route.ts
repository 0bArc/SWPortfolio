import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { adminGrantBadge, adminRevokeBadge } from "@/lib/accounts/manager";

type RouteCtx = { params: Promise<{ username: string }> };

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { username } = await ctx.params;
  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = body.slug?.trim();
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const result = await adminGrantBadge(username, slug);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.data);
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { username } = await ctx.params;
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const result = await adminRevokeBadge(username, slug);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.data);
}

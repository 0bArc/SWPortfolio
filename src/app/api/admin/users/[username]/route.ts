import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import type { AccountSettings } from "@/db/schema";
import {
  adminDeleteUser,
  adminGetUser,
  adminUpdateUser,
} from "@/lib/accounts/manager";

type RouteCtx = { params: Promise<{ username: string }> };

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { username } = await ctx.params;
  const result = await adminGetUser(username);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.data);
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { username } = await ctx.params;
  let body: { displayName?: string; settings?: Partial<AccountSettings> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await adminUpdateUser(username, {
    displayName: body.displayName,
    settings: body.settings,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.data);
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { username } = await ctx.params;
  const result = await adminDeleteUser(username);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return new Response(null, { status: 204 });
}

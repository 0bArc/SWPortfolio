import type { NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin/services/auth";
import { handleModerateUser } from "@/features/admin/api/moderation";

type RouteCtx = { params: Promise<{ username: string }> };

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { username } = await ctx.params;
  return handleModerateUser(request, username);
}

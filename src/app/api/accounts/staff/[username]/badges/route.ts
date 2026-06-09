import type { NextRequest } from "next/server";
import { handleStaffAwardBadge, handleStaffRevokeBadge } from "@/features/accounts/api/staff";

type RouteCtx = { params: Promise<{ username: string }> };

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const { username } = await ctx.params;
  return handleStaffAwardBadge(request, username);
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const { username } = await ctx.params;
  return handleStaffRevokeBadge(request, username);
}

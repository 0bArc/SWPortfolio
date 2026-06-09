import type { NextRequest } from "next/server";
import { handleGetStaffTarget } from "@/features/accounts/api/staff";

type RouteCtx = { params: Promise<{ username: string }> };

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const { username } = await ctx.params;
  return handleGetStaffTarget(username);
}

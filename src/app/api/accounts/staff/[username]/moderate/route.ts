import type { NextRequest } from "next/server";
import { handleStaffModerate } from "@/features/accounts/api/staff";

type RouteCtx = { params: Promise<{ username: string }> };

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const { username } = await ctx.params;
  return handleStaffModerate(request, username);
}

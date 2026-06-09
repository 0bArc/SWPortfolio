import { requireAdmin } from "@/features/admin/services/auth";
import { handleForceVerifyEmail } from "@/features/admin/api/moderation";

type RouteCtx = { params: Promise<{ username: string }> };

export async function POST(_request: Request, ctx: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { username } = await ctx.params;
  return handleForceVerifyEmail(username);
}

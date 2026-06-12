import type { NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin/services/auth";
import { adminListUsers } from "@/features/accounts/services/admin/manager";
import { resolveAdminActor } from "@/features/accounts/services/permissions/actor";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const q = request.nextUrl.searchParams.get("q") ?? undefined;

  try {
    const actor = await resolveAdminActor();
    const result = await adminListUsers(actor, page, q);
    return Response.json(result);
  } catch (err) {
    console.error("adminListUsers error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

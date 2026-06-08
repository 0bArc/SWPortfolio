import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { adminListUsers } from "@/lib/accounts/manager";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const q = request.nextUrl.searchParams.get("q") ?? undefined;

  try {
    const result = await adminListUsers(page, q);
    return Response.json(result);
  } catch (err) {
    console.error("adminListUsers error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

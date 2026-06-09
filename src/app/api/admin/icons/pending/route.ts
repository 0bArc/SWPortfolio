import type { NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin/services/auth";
import { handleListPendingIcons } from "@/features/admin/api/icon-review";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  return handleListPendingIcons(request);
}
